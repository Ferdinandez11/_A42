// --- START OF FILE src/features/editor/engine/managers/SceneManager.ts ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { CameraView } from '../../../../stores/useAppStore';

export class SceneManager {
  public scene: THREE.Scene;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthoCamera: THREE.OrthographicCamera;
  public activeCamera: THREE.Camera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public gridHelper: THREE.GridHelper | null = null;
  public dirLight: THREE.DirectionalLight | null = null;
  public sky: Sky | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // Escena
    this.scene = new THREE.Scene();

    // Cámaras
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.perspectiveCamera.position.set(10, 15, 10);

    const frustumSize = 20;
    this.orthoCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2,
      frustumSize / 2, frustumSize / -2, 0.1, 1000
    );
    this.orthoCamera.position.set(20, 20, 20);
    this.orthoCamera.lookAt(0, 0, 0);

    this.activeCamera = this.perspectiveCamera;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.initEnvironment();
    
    // Shadow Plane
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  private initEnvironment() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.4);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2);
    this.dirLight.position.set(10, 20, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -50;
    this.dirLight.shadow.camera.right = 50;
    this.dirLight.shadow.camera.top = 50;
    this.dirLight.shadow.camera.bottom = -50;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 3;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.7;
    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(45), THREE.MathUtils.degToRad(180));
    uniforms['sunPosition'].value.copy(sun);
    this.scene.add(this.sky);

    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
  }

  public updateSunPosition(azimuth: number, elevation: number) {
    if (!this.sky || !this.dirLight) return;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms['sunPosition'].value.copy(sunPosition);
    this.dirLight.position.copy(sunPosition).multiplyScalar(50);
  }

  public setBackgroundColor(color: string) {
    this.scene.background = new THREE.Color(color);
    if (this.sky) this.sky.visible = false;
  }

  public setSkyVisible(visible: boolean) {
    if (this.sky) { 
        this.sky.visible = visible; 
        this.scene.background = null; 
    }
  }

  public setGridVisible(v: boolean) { 
      if (this.gridHelper) this.gridHelper.visible = v; 
  }

  public switchCamera(type: 'perspective' | 'orthographic') {
    const oldPos = this.activeCamera.position.clone();
    const target = this.controls.target.clone();
    
    if (type === 'orthographic') { 
        this.activeCamera = this.orthoCamera; 
    } else { 
        this.activeCamera = this.perspectiveCamera; 
    }
    
    this.activeCamera.position.copy(oldPos);
    this.activeCamera.lookAt(target);
    this.controls.object = this.activeCamera;
  }

  public setView(view: CameraView) {
    const d = 20; 
    const t = new THREE.Vector3(0,0,0); 
    let p = new THREE.Vector3();
    if (view === 'top') p.set(0, d, 0); 
    else if (view === 'front') p.set(0, 0, d); 
    else if (view === 'side') p.set(d, 0, 0); 
    else p.set(d, d, d);
    
    this.activeCamera.position.copy(p); 
    this.activeCamera.lookAt(t); 
    this.controls.target.copy(t); 
    this.controls.update();
  }

  public onWindowResize = () => {
    if(!this.container) return;
    const w = this.container.clientWidth; 
    const h = this.container.clientHeight;
    
    this.perspectiveCamera.aspect = w/h; 
    this.perspectiveCamera.updateProjectionMatrix();
    
    const a = w/h; const s = 20;
    this.orthoCamera.left = -s*a/2; 
    this.orthoCamera.right = s*a/2; 
    this.orthoCamera.top = s/2; 
    this.orthoCamera.bottom = -s/2;
    this.orthoCamera.updateProjectionMatrix();
    
    this.renderer.setSize(w, h);
  }

  public dispose() {
    try { this.container.removeChild(this.renderer.domElement); } catch (e) {}
    this.renderer.dispose();
  }
}