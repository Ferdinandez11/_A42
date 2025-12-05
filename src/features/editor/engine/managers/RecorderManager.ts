// --- FILE: src/features/editor/engine/managers/RecorderManager.ts ---
import * as THREE from "three";
import type { A42Engine } from "../A42Engine";
import { useEditorStore } from "@/stores/editor/useEditorStore";

//
// ================================================================
// 1) HELPER: Recorder UI Indicator
// ================================================================
class RecorderIndicator {
  private el: HTMLElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.innerText = "● REC";
    Object.assign(this.el.style, {
      position: "absolute",
      top: "20px",
      right: "20px",
      padding: "6px 14px",
      fontSize: "18px",
      fontFamily: "monospace",
      fontWeight: "bold",
      color: "white",
      background: "rgba(200,0,0,0.85)",
      borderRadius: "6px",
      zIndex: "99999",
      pointerEvents: "none",
      display: "none",
      boxShadow: "0 0 8px rgba(0,0,0,0.4)",
      animation: "blinkREC 1s infinite"
    });

    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes blinkREC {
        0% { opacity: 1; }
        50% { opacity: 0.35; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.el);
  }

  show() { this.el.style.display = "block"; }
  hide() { this.el.style.display = "none"; }
}

//
// ================================================================
// 2) HELPER: RecorderState
// ================================================================
class RecorderState {
  private engine: A42Engine;
  private savedPos = new THREE.Vector3();
  private savedRot = new THREE.Euler();
  private savedTarget = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  save() {
    const cam = this.engine.activeCamera;
    this.savedPos.copy(cam.position);
    this.savedRot.copy(cam.rotation);
    this.savedTarget.copy(this.engine.sceneManager.controls.target);
  }

  restore() {
    const cam = this.engine.activeCamera;
    cam.position.copy(this.savedPos);
    cam.rotation.copy(this.savedRot);
    this.engine.sceneManager.controls.target.copy(this.savedTarget);
    this.engine.sceneManager.controls.update();
    this.engine.sceneManager.controls.enabled = true;
  }
}

//
// ================================================================
// 3) HELPER: VideoRecorder
// ================================================================
class VideoRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private onFinish: ((blob: Blob) => void) | null = null;

  start(canvas: HTMLCanvasElement, onFinish: (blob: Blob) => void) {
    this.onFinish = onFinish;

    const stream = canvas.captureStream(30);
    let mime = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";

    this.recorder = new MediaRecorder(stream, { mimeType: mime });
    this.chunks = [];

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: "video/webm" });
      if (this.onFinish) this.onFinish(blob);
    };

    this.recorder.start();
  }

  stop() {
    if (this.recorder && this.recorder.state === "recording") {
      this.recorder.stop();
    }
  }
}

//
// ================================================================
// 4) HELPER: CameraAnimator
// ================================================================
class CameraAnimator {
  public active = false;

  private t = 0;
  private center = new THREE.Vector3();
  private radius = 10;
  private height = 5;
  private duration = 8;
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  configureFromScene() {
    const box = new THREE.Box3();
    let hasItems = false;

    this.engine.scene.traverse((o) => {
      if (o.userData?.isItem) {
        box.expandByObject(o);
        hasItems = true;
      }
    });

    if (!hasItems) return false;

    box.getCenter(this.center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);

    this.radius = maxDim * 0.9 + 2;
    this.height = maxDim * 0.35 + 1;
    this.duration = 8;
    this.t = 0;

    return true;
  }

  start() {
    this.active = true;
    this.engine.sceneManager.controls.enabled = false;
    this.engine.switchCamera("perspective");
  }

  update(delta: number) {
    if (!this.active) return;

    this.t += delta;
    const progress = this.t / this.duration;
    const angle = progress * Math.PI * 2;

    const camX = this.center.x + Math.cos(angle) * this.radius;
    const camZ = this.center.z + Math.sin(angle) * this.radius;

    this.engine.activeCamera.position.set(
      camX,
      this.center.y + this.height,
      camZ
    );

    this.engine.activeCamera.lookAt(this.center);

    if (progress >= 1) {
      this.active = false;
    }
  }
}

//
// ================================================================
// 5) MAIN: RecorderManager
// ================================================================
export class RecorderManager {
  private engine: A42Engine;

  private indicator: RecorderIndicator;
  private state: RecorderState;
  private video: VideoRecorder;
  private animator: CameraAnimator;

  public isRecording = false;
  private pendingName = "";

  constructor(engine: A42Engine) {
    this.engine = engine;

    // 🔧 YA SE PUEDE USAR engine (ya está asignado)
    this.indicator = new RecorderIndicator();
    this.state = new RecorderState(engine);
    this.video = new VideoRecorder();
    this.animator = new CameraAnimator(engine);
  }

  // -------------------------------------------------------------
  // Screenshot
  // -------------------------------------------------------------
  public async takeScreenshot() {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre de la captura:", "captura");

    if (!name) return;

    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    const data = this.engine.renderer.domElement.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = data;
    a.download = `${name}.png`;
    a.click();
  }

  // -------------------------------------------------------------
  // Orbit 360
  // -------------------------------------------------------------
  public async startOrbitAnimation() {
    if (this.isRecording || this.animator.active) return;

    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del video 360:", "video-360");

    if (!name) return;

    this.pendingName = name;

    if (!this.animator.configureFromScene()) {
      alert("No hay objetos para grabar.");
      return;
    }

    this.state.save();
    this.animator.start();
    this.startRecording();
  }

  public update(delta: number) {
    if (!this.animator.active) return;

    this.animator.update(delta);

    if (!this.animator.active) {
      this.stopRecording(true);
      this.state.restore();
    }
  }

  // -------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------
  public startRecording() {
    if (this.isRecording) return;

    this.isRecording = true;
    this.indicator.show();

    const canvas = this.engine.renderer.domElement;

    this.video.start(canvas, (blob) => this.saveVideo(blob));
  }

  public stopRecording(manual = false) {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.indicator.hide();

    this.video.stop();

    if (manual) {
      this.engine.sceneManager.controls.enabled = true;
    }
  }

  // -------------------------------------------------------------
  // Save file
  // -------------------------------------------------------------
  private async saveVideo(blob: Blob) {
    let fileName = this.pendingName;

    if (!fileName) {
      const input = await useEditorStore
        .getState()
        .requestInput("Nombre del video:", "grabacion");

      if (!input) return;

      fileName = input; // lo validamos
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.webm`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 300);
  }
}
