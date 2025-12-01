// --- START OF FILE src/features/editor/engine/managers/RecorderManager.ts ---
import * as THREE from 'three';
import type { A42Engine } from '../A42Engine';

export class RecorderManager {
  private engine: A42Engine;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;
  private recIndicator: HTMLElement | null = null;

  // Variables para la animación 360
  private isOrbiting = false;
  private orbitCenter = new THREE.Vector3();
  private orbitRadius = 10;
  private orbitHeight = 10;
  private orbitAngle = 0;
  private orbitDuration = 8.0; // Segundos
  private orbitTimeElapsed = 0;

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.createRecIndicator();
  }

  private createRecIndicator() {
    this.recIndicator = document.createElement('div');
    this.recIndicator.innerText = '🔴 REC';
    this.recIndicator.style.position = 'absolute';
    this.recIndicator.style.top = '20px';
    this.recIndicator.style.right = '20px';
    this.recIndicator.style.color = 'red';
    this.recIndicator.style.fontWeight = 'bold';
    this.recIndicator.style.fontSize = '20px';
    this.recIndicator.style.fontFamily = 'monospace';
    this.recIndicator.style.background = 'rgba(0, 0, 0, 0.5)';
    this.recIndicator.style.padding = '5px 15px';
    this.recIndicator.style.borderRadius = '5px';
    this.recIndicator.style.pointerEvents = 'none'; 
    this.recIndicator.style.display = 'none'; 
    this.recIndicator.style.zIndex = '9999';
    
    this.recIndicator.style.animation = 'blink 1s infinite';
    const style = document.createElement('style');
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

  // --- 1. FUNCIÓN FOTO INSTANTÁNEA ---
  public takeScreenshot() {
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    const dataURL = this.engine.renderer.domElement.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `foto-a42-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- 2. FUNCIÓN ORBITAL 360 ---
  public startOrbitAnimation() {
    if (this.isRecording || this.isOrbiting) return;

    // 1. Calcular el centro de todos los objetos (Bounding Box)
    const box = new THREE.Box3();
    let hasItems = false;
    
    this.engine.scene.traverse((obj) => {
        if (obj.userData?.isItem) {
            box.expandByObject(obj);
            hasItems = true;
        }
    });

    if (!hasItems) {
        alert("Añade objetos a la escena para hacer el vídeo.");
        return;
    }

    // 2. Configurar parámetros de órbita
    box.getCenter(this.orbitCenter);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);
    
    // --- AJUSTES DE CÁMARA AQUÍ ---
    // Radio (Distancia): Antes era * 1.5. Ahora * 0.85 para acercar mucho más.
    this.orbitRadius = maxDim * 0.85 + 2; 
    
    // Altura (Inclinación): Antes era igual al ancho. Ahora * 0.4 para bajarla.
    // Esto dará un ángulo más "a ras de suelo" pero viendo la parte superior.
    this.orbitHeight = maxDim * 0.4 + 1;       

    this.orbitAngle = 0;
    this.orbitTimeElapsed = 0;

    // 3. Preparar cámara y controles
    this.engine.switchCamera('perspective'); 
    this.engine.sceneManager.controls.enabled = false; 
    
    this.isOrbiting = true;

    // 4. Empezar a grabar
    this.startRecording();
  }

  public update(delta: number) {
    if (!this.isOrbiting) return;

    this.orbitTimeElapsed += delta;

    // Calcular progreso (0 a 1)
    const progress = this.orbitTimeElapsed / this.orbitDuration;

    // Mover cámara en círculo
    const angle = progress * Math.PI * 2; 

    const camX = this.orbitCenter.x + Math.cos(angle) * this.orbitRadius;
    const camZ = this.orbitCenter.z + Math.sin(angle) * this.orbitRadius;

    this.engine.activeCamera.position.set(camX, this.orbitCenter.y + this.orbitHeight, camZ);
    this.engine.activeCamera.lookAt(this.orbitCenter);

    // Finalizar cuando pasen los 8 segundos
    if (this.orbitTimeElapsed >= this.orbitDuration) {
        this.stopOrbitAnimation();
    }
  }

  private stopOrbitAnimation() {
    this.isOrbiting = false;
    this.stopRecording();
    this.engine.sceneManager.controls.enabled = true; // Devolver control al usuario
  }

  // --- GRABACIÓN ESTÁNDAR ---
  public startRecording() {
    if (this.isRecording) return; 

    const canvas = this.engine.renderer.domElement;
    const stream = canvas.captureStream(30);
    
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm'; 
    }
    const options: MediaRecorderOptions = { mimeType: mimeType };

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.error("Error recorder:", e);
      return;
    }

    this.recordedChunks = [];
    this.isRecording = true;
    
    if (this.recIndicator) this.recIndicator.style.display = 'block';

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };

    this.mediaRecorder.onstop = this.saveVideo;
    this.mediaRecorder.start();
    console.log("🎥 Grabación iniciada...");
  }

  public stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;
    this.mediaRecorder.stop();
    this.isRecording = false;
    if (this.recIndicator) this.recIndicator.style.display = 'none';
    console.log("🛑 Grabación detenida.");
  }

  private saveVideo = () => {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `video-360-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };
}
// --- END OF FILE src/features/editor/engine/managers/RecorderManager.ts ---