// --- START OF FILE src/features/editor/engine/managers/WalkManager.ts ---
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { A42Engine } from '../A42Engine';

export class WalkManager {
  private engine: A42Engine;
  private controls: PointerLockControls;
  
  // Estado de teclas
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;   // Tecla E
  private moveDown = false; // Tecla Q
  private isSlow = false;   // Tecla Espacio (Modo precisión)

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  
  // CONFIGURACIÓN
  private baseSpeed = 80.0; // Velocidad normal
  private slowMultiplier = 0.15; // Velocidad reducida (al pulsar espacio)

  constructor(engine: A42Engine) {
    this.engine = engine;
    
    this.controls = new PointerLockControls(this.engine.activeCamera, this.engine.renderer.domElement);
    
    // --- AJUSTE DE SENSIBILIDAD DEL RATÓN ---
    // 1.0 es la normal. Bajamos a 0.3 para que sea más suave y cinemático.
    this.controls.pointerSpeed = 0.3; 

    this.controls.addEventListener('lock', () => {
      // Opcional: Ocultar UI si quisieras
    });

    this.controls.addEventListener('unlock', () => {
      // Al salir, reseteamos teclas por si se quedó alguna 'pegada'
      this.resetKeys();
    });

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    this.engine.scene.add(this.controls.getObject());
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

  private resetKeys() {
      this.moveForward = false; this.moveBackward = false; 
      this.moveLeft = false; this.moveRight = false;
      this.moveUp = false; this.moveDown = false;
      this.isSlow = false;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = true; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = true; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = true; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = true; break;
      case 'KeyE': this.moveUp = true; break;
      case 'KeyQ': this.moveDown = true; break;
      case 'Space': this.isSlow = true; break; // Activar modo lento
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = false; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = false; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = false; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = false; break;
      case 'KeyE': this.moveUp = false; break;
      case 'KeyQ': this.moveDown = false; break;
      case 'Space': this.isSlow = false; break; // Desactivar modo lento
    }
  };

  public update(delta: number) {
    if (!this.controls.isLocked) return;

    // Fricción (frenado)
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= this.velocity.y * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.y = Number(this.moveUp) - Number(this.moveDown);
    this.direction.normalize();

    // Calcular velocidad actual (Rápida o Lenta)
    const currentSpeed = this.isSlow ? (this.baseSpeed * this.slowMultiplier) : this.baseSpeed;

    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;
    if (this.moveUp || this.moveDown) this.velocity.y += this.direction.y * currentSpeed * delta;

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);
    this.controls.getObject().position.y += this.velocity.y * delta;
  }
}
// --- END OF FILE src/features/editor/engine/managers/WalkManager.ts ---