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

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private speed = 100.0; // Ajusta la velocidad aquí

  constructor(engine: A42Engine) {
    this.engine = engine;
    
    // Inicializamos los controles (pero no los activamos aún)
    this.controls = new PointerLockControls(this.engine.activeCamera, this.engine.renderer.domElement);

    // Eventos para saber si hemos entrado/salido del modo
    this.controls.addEventListener('lock', () => {
      console.log("Modo Paseo: ACTIVADO");
      // Aquí podrías ocultar menús de la UI si quieres
    });

    this.controls.addEventListener('unlock', () => {
      console.log("Modo Paseo: DESACTIVADO");
    });

    // Escuchar teclas
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    // Añadir el objeto de control a la escena (necesario para que funcione la física de la cámara)
    this.engine.scene.add(this.controls.getObject());
  }

  // Método para activar el modo desde un botón
  public enable() {
    this.controls.lock(); // Esto pide al navegador capturar el mouse
  }

  public disable() {
    this.controls.unlock();
  }

  public get isEnabled() {
    return this.controls.isLocked;
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
    }
  };

  // Esta función debe llamarse en el bucle principal (tick/update)
  public update(delta: number) {
    if (!this.controls.isLocked) return;

    // Reducir velocidad poco a poco (fricción) para que no deslice como hielo
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= this.velocity.y * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.y = Number(this.moveUp) - Number(this.moveDown);
    
    this.direction.normalize(); // Para que moverse en diagonal no sea más rápido

    // Movimiento WASD
    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;
    
    // Movimiento Q/E (Vertical absoluto)
    if (this.moveUp || this.moveDown) {
        this.velocity.y += this.direction.y * this.speed * delta;
    }

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);
    
    // Subir/Bajar manualmente modificando la Y de la cámara
    this.controls.getObject().position.y += this.velocity.y * delta;
  }
}