// --- START OF FILE src/features/editor/engine/managers/WalkManager.ts ---
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { A42Engine } from '../A42Engine';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface MovementKeys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  slow: boolean;
}

interface MovementConfig {
  baseSpeed: number;
  slowMultiplier: number;
  damping: number;
  pointerSpeed: number;
}

interface InstructionsStyle {
  position: string;
  bottom: string;
  left: string;
  transform: string;
  backgroundColor: string;
  color: string;
  padding: string;
  borderRadius: string;
  textAlign: string;
  fontFamily: string;
  pointerEvents: string;
  display: string;
  zIndex: string;
  backdropFilter: string;
  border: string;
}

// ============================================================================
// CLASE WALKMANAGER
// ============================================================================

export class WalkManager {
  private engine: A42Engine;
  private controls: PointerLockControls;
  
  // Elemento HTML para las instrucciones
  private instructions: HTMLElement | null = null;
  
  // Estado de teclas
  private keys: MovementKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    slow: false,
  };

  // Vectores de física
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  
  // Configuración de movimiento
  private config: MovementConfig = {
    baseSpeed: 80.0,
    slowMultiplier: 0.2,
    damping: 10.0,
    pointerSpeed: 0.15,
  };

  constructor(engine: A42Engine) {
    this.engine = engine;
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    // Inicializar controles
    this.controls = new PointerLockControls(
      this.engine.activeCamera,
      this.engine.renderer.domElement
    );
    this.controls.pointerSpeed = this.config.pointerSpeed;
    
    // Crear interfaz de usuario
    this.createInstructions();
    
    // Configurar eventos
    this.setupEventListeners();
    
    // Agregar controles a la escena
    this.engine.scene.add(this.controls.getObject());
  }

  // ==========================================================================
  // CONFIGURACIÓN INICIAL
  // ==========================================================================

  private setupEventListeners(): void {
    // Eventos de pointer lock
    this.controls.addEventListener('lock', this.onLock);
    this.controls.addEventListener('unlock', this.onUnlock);

    // Eventos de teclado
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  private createInstructions(): void {
    this.instructions = document.createElement('div');
    this.instructions.innerHTML = this.getInstructionsHTML();
    
    // Aplicar estilos
    const styles = this.getInstructionsStyles();
    Object.assign(this.instructions.style, styles);

    document.body.appendChild(this.instructions);
  }

  private getInstructionsHTML(): string {
    return `
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
        MODO PASEO
      </div>
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
  }

  private getInstructionsStyles(): Partial<InstructionsStyle> {
    return {
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '15px 25px',
      borderRadius: '30px',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '2000',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(255,255,255,0.2)',
    };
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS
  // ==========================================================================

  public enable(): void {
    this.controls.lock();
  }

  public disable(): void {
    this.controls.unlock();
  }

  public get isEnabled(): boolean {
    return this.controls.isLocked;
  }

  public update(delta: number): void {
    if (!this.controls.isLocked) return;

    this.applyDamping(delta);
    this.calculateDirection();
    this.applyMovement(delta);
    this.updatePosition(delta);
  }

  // ==========================================================================
  // EVENTOS DE POINTER LOCK
  // ==========================================================================

  private onLock = (): void => {
    if (this.instructions) {
      this.instructions.style.display = 'block';
    }
  };

  private onUnlock = (): void => {
    this.resetKeys();
    if (this.instructions) {
      this.instructions.style.display = 'none';
    }
  };

  // ==========================================================================
  // GESTIÓN DE TECLADO
  // ==========================================================================

  private onKeyDown = (event: KeyboardEvent): void => {
    // Ignorar si hay un input activo
    if (this.isInputActive()) return;

    switch (event.code) {
      // Movimiento adelante/atrás
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = true;
        break;
      
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = true;
        break;

      // Movimiento izquierda/derecha
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;

      // Movimiento vertical
      case 'KeyE':
        this.keys.up = true;
        break;
      
      case 'KeyQ':
        this.keys.down = true;
        break;

      // Modificadores
      case 'Space':
        this.keys.slow = true;
        break;
      
      // Acciones especiales
      case 'KeyR':
        this.handleRecordingToggle();
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = false;
        break;
      
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = false;
        break;
      
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
      
      case 'KeyE':
        this.keys.up = false;
        break;
      
      case 'KeyQ':
        this.keys.down = false;
        break;
      
      case 'Space':
        this.keys.slow = false;
        break;
    }
  };

  private isInputActive(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' || 
           activeElement?.tagName === 'TEXTAREA';
  }

  private resetKeys(): void {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      slow: false,
    };
  }

  // ==========================================================================
  // FÍSICA Y MOVIMIENTO
  // ==========================================================================

  private applyDamping(delta: number): void {
    const dampingFactor = this.config.damping * delta;
    
    this.velocity.x -= this.velocity.x * dampingFactor;
    this.velocity.y -= this.velocity.y * dampingFactor;
    this.velocity.z -= this.velocity.z * dampingFactor;
  }

  private calculateDirection(): void {
    this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.direction.x = Number(this.keys.right) - Number(this.keys.left);
    this.direction.y = Number(this.keys.up) - Number(this.keys.down);
    
    this.direction.normalize();
  }

  private applyMovement(delta: number): void {
    const currentSpeed = this.getCurrentSpeed();

    // Movimiento horizontal
    if (this.keys.forward || this.keys.backward) {
      this.velocity.z -= this.direction.z * currentSpeed * delta;
    }
    
    if (this.keys.left || this.keys.right) {
      this.velocity.x -= this.direction.x * currentSpeed * delta;
    }

    // Movimiento vertical
    if (this.keys.up || this.keys.down) {
      this.velocity.y += this.direction.y * currentSpeed * delta;
    }
  }

  private updatePosition(delta: number): void {
    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);
    
    const cameraObject = this.controls.getObject();
    cameraObject.position.y += this.velocity.y * delta;
  }

  private getCurrentSpeed(): number {
    return this.keys.slow 
      ? this.config.baseSpeed * this.config.slowMultiplier
      : this.config.baseSpeed;
  }

  // ==========================================================================
  // ACCIONES ESPECIALES
  // ==========================================================================

  private handleRecordingToggle(): void {
    if (!this.isEnabled) return;

    const recorder = this.engine.recorderManager;
    
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      recorder.startRecording();
    }
  }

  // ==========================================================================
  // LIMPIEZA
  // ==========================================================================

  public dispose(): void {
    // Remover event listeners
    this.controls.removeEventListener('lock', this.onLock);
    this.controls.removeEventListener('unlock', this.onUnlock);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

    // Remover instrucciones del DOM
    if (this.instructions && this.instructions.parentNode) {
      this.instructions.parentNode.removeChild(this.instructions);
      this.instructions = null;
    }

    // Liberar controles
    this.controls.unlock();
    this.controls.dispose();
  }
}

// --- END OF FILE ---