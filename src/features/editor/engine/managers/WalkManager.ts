// --- FILE: src/features/editor/engine/managers/WalkManager.ts ---
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { A42Engine } from "../A42Engine";

export class WalkManager {
  private engine: A42Engine;
  private controls: PointerLockControls;

  private hud: HTMLElement | null = null;

  // Movimiento
  private vel = new THREE.Vector3();
  private dir = new THREE.Vector3();

  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;
  private isSlow = false;

  private baseSpeed = 80;
  private slowMultiplier = 0.2;

  constructor(engine: A42Engine) {
    this.engine = engine;

    this.controls = new PointerLockControls(
      this.engine.activeCamera,
      this.engine.renderer.domElement
    );
    this.controls.pointerSpeed = 0.15;

    this.createHUD();

    // PointerLock events
    this.controls.addEventListener("lock", () => {
      if (this.hud) this.hud.style.display = "block";
    });

    this.controls.addEventListener("unlock", () => {
      this.resetMovement();
      if (this.hud) this.hud.style.display = "none";
    });

    // Key listeners
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);

    this.engine.scene.add(this.controls.getObject());
  }

  // ============================================================================
  // HUD
  // ============================================================================
  private createHUD() {
    const hud = document.createElement("div");
    hud.className = "walk-hud";

    hud.innerHTML = `
      <div class="walk-title">MODO PASEO</div>
      <div class="walk-info">
        🖱️ Mueve para mirar —  
        <b>WASD</b> mover —  
        <b>Q/E</b> altura —  
        <b>Espacio</b> lento —  
        <b>ESC</b> salir<br/>
        <span class="walk-rec">🔴 'R' para grabar</span>
      </div>
    `;

    Object.assign(hud.style, {
      position: "absolute",
      bottom: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "14px 24px",
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
      fontFamily: "sans-serif",
      borderRadius: "28px",
      textAlign: "center",
      pointerEvents: "none",
      display: "none",
      zIndex: "2000",
      backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.15)",
      fontSize: "13px",
      lineHeight: "18px"
    });

    document.body.appendChild(hud);
    this.hud = hud;
  }

  // ============================================================================
  // STATE
  // ============================================================================
  private resetMovement() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.isSlow = false;
  }

  public enable() {
    this.controls.lock();
  }

  public disable() {
    this.controls.unlock();
  }

  public get isEnabled() {
    return this.controls.isLocked;
  }

  // ============================================================================
  // INPUT
  // ============================================================================
  private onKeyDown = (e: KeyboardEvent) => {
    if (document.activeElement instanceof HTMLInputElement) return;

    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.moveForward = true;
        break;

      case "KeyS":
      case "ArrowDown":
        this.moveBackward = true;
        break;

      case "KeyA":
      case "ArrowLeft":
        this.moveLeft = true;
        break;

      case "KeyD":
      case "ArrowRight":
        this.moveRight = true;
        break;

      case "KeyE":
        this.moveUp = true;
        break;

      case "KeyQ":
        this.moveDown = true;
        break;

      case "Space":
        this.isSlow = true;
        break;

      case "KeyR":
        if (this.isEnabled) {
          const rec = this.engine.recorderManager;
          rec.isRecording ? rec.stopRecording() : rec.startRecording();
        }
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.moveForward = false;
        break;

      case "KeyS":
      case "ArrowDown":
        this.moveBackward = false;
        break;

      case "KeyA":
      case "ArrowLeft":
        this.moveLeft = false;
        break;

      case "KeyD":
      case "ArrowRight":
        this.moveRight = false;
        break;

      case "KeyE":
        this.moveUp = false;
        break;

      case "KeyQ":
        this.moveDown = false;
        break;

      case "Space":
        this.isSlow = false;
        break;
    }
  };

  // ============================================================================
  // UPDATE LOOP
  // ============================================================================
  public update(delta: number) {
    if (!this.controls.isLocked) return;

    // Damping
    this.vel.multiplyScalar(1 - 10 * delta);

    // Dirección
    this.dir.set(
      Number(this.moveRight) - Number(this.moveLeft),
      Number(this.moveUp) - Number(this.moveDown),
      Number(this.moveForward) - Number(this.moveBackward)
    );

    if (this.dir.lengthSq() > 0) this.dir.normalize();

    const speed = this.isSlow
      ? this.baseSpeed * this.slowMultiplier
      : this.baseSpeed;

    // Aplicar aceleración
    this.vel.x -= this.dir.x * speed * delta;
    this.vel.y += this.dir.y * speed * delta;
    this.vel.z -= this.dir.z * speed * delta;

    this.controls.moveRight(-this.vel.x * delta);
    this.controls.moveForward(-this.vel.z * delta);

    const camObj = this.controls.getObject();
    camObj.position.y += this.vel.y * delta;
  }
}
