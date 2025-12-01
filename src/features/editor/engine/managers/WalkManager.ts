// --- START OF FILE src/features/editor/engine/managers/WalkManager.ts ---
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { A42Engine } from '../A42Engine';

export class WalkManager {
  private engine: A42Engine;
  private controls: PointerLockControls;
  
  // Elemento HTML para las instrucciones
  private instructions: HTMLElement | null = null;
  
  // Estado de teclas
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;   
  private moveDown = false; 
  private isSlow = false;   

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  
  private baseSpeed = 80.0; 
  private slowMultiplier = 0.2; 

  constructor(engine: A42Engine) {
    this.engine = engine;
    
    this.controls = new PointerLockControls(this.engine.activeCamera, this.engine.renderer.domElement);
    this.controls.pointerSpeed = 0.15; 
    
    // Crear el cartel de instrucciones (oculto al inicio)
    this.createInstructions();

    // Eventos de entrar/salir
    this.controls.addEventListener('lock', () => { 
        if (this.instructions) this.instructions.style.display = 'block';
    });
    
    this.controls.addEventListener('unlock', () => { 
        this.resetKeys(); 
        if (this.instructions) this.instructions.style.display = 'none';
    });

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    this.engine.scene.add(this.controls.getObject());
  }

  private createInstructions() {
    this.instructions = document.createElement('div');
    this.instructions.innerHTML = `
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">MODO PASEO</div>
        <div style="font-size: 12px; opacity: 0.8;">
            <span style="margin-right: 15px;">🖱️ Mueve para mirar</span>
            <span style="margin-right: 15px;">⌨️ <b>WASD</b> Moverse</span>
            <span style="margin-right: 15px;">🐢 <b>Espacio</b> Lento</span>
            <span style="margin-right: 15px;">↕️ <b>Q / E</b> Altura</span>
            <br/>
            <span style="color: #ff6b6b; font-weight: bold;">🔴 TECLA 'R' PARA GRABAR</span>
            <span style="margin-left: 15px;">❌ <b>ESC</b> Salir</span>
        </div>
    `;
    
    // Estilos del cartel
    Object.assign(this.instructions.style, {
        position: 'absolute',
        bottom: '100px', // Un poco arriba del toolbar
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '30px',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        pointerEvents: 'none', // Para que no bloquee clicks
        display: 'none', // Oculto por defecto
        zIndex: '2000',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255,255,255,0.2)'
    });

    document.body.appendChild(this.instructions);
  }

  public enable() { this.controls.lock(); }
  public disable() { this.controls.unlock(); }
  public get isEnabled() { return this.controls.isLocked; }

  private resetKeys() {
      this.moveForward = false; this.moveBackward = false; 
      this.moveLeft = false; this.moveRight = false;
      this.moveUp = false; this.moveDown = false;
      this.isSlow = false;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT') return;

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
      case 'Space': this.isSlow = true; break;
      
      case 'KeyR': 
        if (this.isEnabled) {
            const recorder = this.engine.recorderManager;
            if (recorder.isRecording) recorder.stopRecording();
            else recorder.startRecording();
        }
        break;
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
      case 'Space': this.isSlow = false; break; 
    }
  };

  public update(delta: number) {
    if (!this.controls.isLocked) return;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= this.velocity.y * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.y = Number(this.moveUp) - Number(this.moveDown);
    this.direction.normalize();

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