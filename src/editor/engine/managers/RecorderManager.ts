import * as THREE from "three";
import type { A42Engine } from "../A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

/**
 * Manages screen recording and screenshot capture
 * Handles 360° orbit animations and video recording
 */
export class RecorderManager {
  private engine: A42Engine;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;
  private recIndicator: HTMLElement | null = null;

  // 360° orbit animation variables
  private isOrbiting: boolean = false;
  private orbitCenter: THREE.Vector3 = new THREE.Vector3();
  private orbitRadius: number = 10;
  private orbitHeight: number = 10;
  private orbitDuration: number = 8.0;
  private orbitTimeElapsed: number = 0;

  private pendingFileName: string = "";

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.createRecIndicator();
  }

  /**
   * Creates the recording indicator overlay
   */
  private createRecIndicator(): void {
    this.recIndicator = document.createElement("div");
    this.recIndicator.innerText = "🔴 REC";
    this.recIndicator.style.position = "absolute";
    this.recIndicator.style.top = "20px";
    this.recIndicator.style.right = "20px";
    this.recIndicator.style.color = "red";
    this.recIndicator.style.fontWeight = "bold";
    this.recIndicator.style.fontSize = "20px";
    this.recIndicator.style.fontFamily = "monospace";
    this.recIndicator.style.background = "rgba(0, 0, 0, 0.5)";
    this.recIndicator.style.padding = "5px 15px";
    this.recIndicator.style.borderRadius = "5px";
    this.recIndicator.style.pointerEvents = "none";
    this.recIndicator.style.display = "none";
    this.recIndicator.style.zIndex = "9999";
    this.recIndicator.style.animation = "blink 1s infinite";

    // Add blink animation
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes blink { 
        0% { opacity: 1; } 
        50% { opacity: 0.3; } 
        100% { opacity: 1; } 
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.recIndicator);
  }

  /**
   * Takes a screenshot of the current view
   */
  public async takeScreenshot(): Promise<void> {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre de la foto:", "captura");
    if (name === null) return;

    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    const dataURL = this.engine.renderer.domElement.toDataURL("image/png");

    const anchor = document.createElement("a");
    anchor.href = dataURL;
    anchor.download = `${name}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  /**
   * Starts a 360° orbit animation with recording
   */
  public async startOrbitAnimation(): Promise<void> {
    if (this.isRecording || this.isOrbiting) return;

    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del video 360:", "video-360");
    if (name === null) return;

    this.pendingFileName = name;

    // Calculate scene bounding box
    const boundingBox = new THREE.Box3();
    let hasItems = false;
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem) {
        boundingBox.expandByObject(obj);
        hasItems = true;
      }
    });

    if (!hasItems) {
      alert("Añade objetos a la escena.");
      return;
    }

    boundingBox.getCenter(this.orbitCenter);
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.z);

    this.orbitRadius = maxDimension * 0.85 + 2;
    this.orbitHeight = maxDimension * 0.4 + 1;
    this.orbitTimeElapsed = 0;

    this.engine.switchCamera("perspective");
    this.engine.sceneManager.controls.enabled = false;

    this.isOrbiting = true;
    this.startRecording();
  }

  /**
   * Updates the orbit animation
   * @param delta - Time elapsed since last frame
   */
  public update(delta: number): void {
    if (!this.isOrbiting) return;

    this.orbitTimeElapsed += delta;
    const progress = this.orbitTimeElapsed / this.orbitDuration;
    const angle = progress * Math.PI * 2;

    const cameraX = this.orbitCenter.x + Math.cos(angle) * this.orbitRadius;
    const cameraZ = this.orbitCenter.z + Math.sin(angle) * this.orbitRadius;

    this.engine.activeCamera.position.set(
      cameraX,
      this.orbitCenter.y + this.orbitHeight,
      cameraZ
    );
    this.engine.activeCamera.lookAt(this.orbitCenter);

    if (this.orbitTimeElapsed >= this.orbitDuration) {
      this.stopOrbitAnimation();
    }
  }

  /**
   * Stops the orbit animation
   */
  private stopOrbitAnimation(): void {
    this.isOrbiting = false;
    this.stopRecording();
    this.engine.sceneManager.controls.enabled = true;
  }

  /**
   * Starts recording the canvas
   */
  public startRecording(): void {
    if (this.isRecording) return;

    if (!this.isOrbiting) {
      this.pendingFileName = "";
    }

    const canvas = this.engine.renderer.domElement;
    const stream = canvas.captureStream(30);

    // Determine supported MIME type
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    const options: MediaRecorderOptions = { mimeType };

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (error) {
      editorErrorHandler.handleError(error, {
        userMessage: 'Error al crear el grabador de video',
        severity: ErrorSeverity.MEDIUM,
        showToast: false,
      });
      return;
    }

    this.recordedChunks = [];
    this.isRecording = true;

    if (this.recIndicator) {
      this.recIndicator.style.display = "block";
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = this.saveVideo;
    this.mediaRecorder.start();
    // Grabación iniciada (sin log para evitar ruido en consola)
  }

  /**
   * Stops the recording
   */
  public stopRecording(): void {
    if (!this.mediaRecorder || !this.isRecording) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    if (this.recIndicator) {
      this.recIndicator.style.display = "none";
    }
    // Grabación detenida (sin log para evitar ruido en consola)
  }

  /**
   * Saves the recorded video
   */
  private saveVideo = async (): Promise<void> => {
    let fileName = this.pendingFileName;

    if (!fileName) {
      setTimeout(async () => {
        const result = await useEditorStore
          .getState()
          .requestInput("Nombre del recorrido:", "paseo-virtual");
        if (result === null) return;
        this.downloadBlob(result);
      }, 50);
    } else {
      this.downloadBlob(fileName);
    }
  };

  /**
   * Downloads the video blob
   */
  private downloadBlob(filename: string): void {
    const blob = new Blob(this.recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.href = url;
    anchor.download = `${filename}.webm`;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}