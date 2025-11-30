// --- START OF FILE src/features/editor/engine/A42Engine.ts ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

import { useAppStore } from '../../../stores/useAppStore';
import type { ProductDefinition, SceneItem, CameraView } from '../../../stores/useAppStore';

type PlaceableProduct = ProductDefinition & { initialScale?: [number, number, number] };

export class A42Engine {
  private scene: THREE.Scene;
  
  private perspectiveCamera: THREE.PerspectiveCamera;
  private orthoCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.Camera;

  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private controls: OrbitControls;
  public transformControl: TransformControls | null = null; 

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private interactionPlane: THREE.Mesh; 

  private loader: GLTFLoader;
  private assetCache: { [url: string]: THREE.Group } = {};
  
  private gridHelper: THREE.GridHelper | null = null;
  // Guardamos referencias para modificarlas luego
  private dirLight: THREE.DirectionalLight | null = null;
  private sky: Sky | null = null;

  private floorPoints: THREE.Vector3[] = [];
  private floorMarkers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;

  private animationId: number | null = null;
  private isDraggingGizmo = false;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    this.scene = new THREE.Scene();

    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.perspectiveCamera.position.set(10, 15, 10);

    const frustumSize = 20;
    this.orthoCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    this.orthoCamera.position.set(20, 20, 20);
    this.orthoCamera.lookAt(0, 0, 0);

    this.activeCamera = this.perspectiveCamera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); // preserveDrawingBuffer ayuda en snapshots a veces
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    try {
        this.transformControl = new TransformControls(this.activeCamera, this.renderer.domElement);
        this.transformControl.rotationSnap = Math.PI / 12;
        this.scene.add(this.transformControl);
        
        this.transformControl.addEventListener('dragging-changed', (event: { value: boolean }) => {
          this.isDraggingGizmo = event.value;
          this.controls.enabled = !event.value;
          if (event.value) {
            useAppStore.getState().saveSnapshot();
          } else {
            if (this.transformControl?.object) {
              this.adjustObjectToGround(this.transformControl.object);
              this.syncTransformToStore(this.transformControl.object);
            }
          }
        });
        
        this.transformControl.addEventListener('objectChange', () => {
          if (this.transformControl?.object && !this.isDraggingGizmo) {
             this.adjustObjectToGround(this.transformControl.object);
             this.syncTransformToStore(this.transformControl.object);
          } else if (this.transformControl?.object) {
             this.adjustObjectToGround(this.transformControl.object);
          }
        });

        this.transformControl.detach();
        this.transformControl.visible = false;
    } catch (e) {
        console.error("ERROR: TransformControls", e);
        this.transformControl = null;
    }

    this.loader = new GLTFLoader();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.initEnvironment();
    this.interactionPlane = this.createInteractionPlane();

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
  }

  // --- NUEVO: GESTIÓN DE ENTORNO ---

  public updateSunPosition(azimuth: number, elevation: number) {
    if (!this.sky || !this.dirLight) return;

    // Convertir coordenadas esféricas a vector 3D
    // Azimut: rotación alrededor del eje Y (horizonte)
    // Elevación: ángulo sobre el horizonte (90 = cenit)
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    // Actualizar Sky
    this.sky.material.uniforms['sunPosition'].value.copy(sunPosition);

    // Actualizar Luz Direccional (La movemos lejos en la dirección del sol)
    // Multiplicamos por 50 para que esté "lejos" pero dentro de un rango razonable
    this.dirLight.position.copy(sunPosition).multiplyScalar(50);
  }

  public setBackgroundColor(color: string) {
    // Si es un hex, ponemos color solido. Si queremos mantener el cielo, usamos null o transparente.
    // Para simplificar: si el color es muy oscuro o específico, quitamos la visibilidad del Sky o ajustamos el fondo.
    
    // NOTA: El Sky shader de Three.js cubre todo el fondo. 
    // Si queremos ver un color sólido, tenemos que ocultar el Sky.
    
    if (this.sky) {
      // Si el usuario elige un color sólido que NO sea el entorno por defecto, ocultamos el cielo
      // Vamos a asumir que si pasa un color, quiere ese color de fondo.
      // Si pasa 'sky' o null, mostramos el cielo procedural.
      
      /* Lógica simple para este ejemplo:
         El usuario quiere cambiar el "entorno".
         El Sky de threejs es muy dominante.
         Si seleccionamos un color plano, ocultamos el Sky y ponemos scene.background.
      */
      
      this.scene.background = new THREE.Color(color);
      // Para que se vea el color de fondo, el Sky debe ser invisible o no estar.
      // O podemos usar Fog para integrar el color.
      
      // Opción A: Color sólido puro (bueno para visualización técnica)
      this.sky.visible = false;
      
      // Opción B: Si el color es "negro/gris" por defecto, mostramos el cielo?
      // Vamos a dejarlo manual:
    }
  }

  // Método auxiliar para reactivar el cielo si quisieras un botón "Modo Realista"
  public setSkyVisible(visible: boolean) {
    if (this.sky) this.sky.visible = visible;
  }

  private initEnvironment() {
    // 1. Luz Hemisférica (Ambiente base suave)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.4);
    this.scene.add(hemiLight);

    // 2. Luz Direccional (Sol)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 2);
    this.dirLight.position.set(10, 20, 10);
    this.dirLight.castShadow = true;

    // --- CORRECCIÓN DE SOMBRAS (Shadow Clipping) ---
    // Aumentamos el tamaño del mapa de sombras
    this.dirLight.shadow.mapSize.width = 2048; 
    this.dirLight.shadow.mapSize.height = 2048;
    
    // Aumentamos el área que cubre la cámara de sombras (Frustum)
    const d = 50; // Área de 100x100 metros
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    
    // Ajustamos planos de recorte de sombra
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 200;
    
    // Ajuste de bias para evitar "shadow acne"
    this.dirLight.shadow.bias = -0.0005;

    this.scene.add(this.dirLight);

    // 3. Cielo Procedural (Sky)
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    
    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 3;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.7;
    
    // Posición inicial del sol
    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 45); // 45 grados elevación
    const theta = THREE.MathUtils.degToRad(180);   // sur
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);
    
    this.scene.add(this.sky);

    // Grid
    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    // Plano receptor de sombras (invisible pero captura sombras)
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500), 
        new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005; // Apenas por encima del 0 para evitar z-fighting con suelos
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  // ... (Resto de métodos: setGizmoMode, switchCamera, setView, setGridVisible, syncSceneFromStore, etc... IGUAL QUE ANTES) ...
  
  public setGizmoMode(mode: 'translate' | 'rotate' | 'scale') {
    if (this.transformControl) {
      this.transformControl.setMode(mode);
    }
  }

  public switchCamera(type: 'perspective' | 'orthographic') {
    const oldPos = this.activeCamera.position.clone();
    const target = this.controls.target.clone();

    if (type === 'orthographic') {
      this.activeCamera = this.orthoCamera;
      this.activeCamera.position.copy(oldPos);
      this.activeCamera.lookAt(target);
    } else {
      this.activeCamera = this.perspectiveCamera;
      this.activeCamera.position.copy(oldPos);
      this.activeCamera.lookAt(target);
    }

    this.controls.object = this.activeCamera;
    if (this.transformControl) {
      this.transformControl.camera = this.activeCamera;
    }
  }

  public setView(view: CameraView) {
    const distance = 20; 
    const target = new THREE.Vector3(0, 0, 0); 
    let newPos = new THREE.Vector3();

    switch (view) {
      case 'top': newPos.set(0, distance, 0); break;
      case 'front': newPos.set(0, 0, distance); break;
      case 'side': newPos.set(distance, 0, 0); break;
      case 'iso': newPos.set(distance, distance, distance); break;
    }
    
    this.activeCamera.position.copy(newPos);
    this.activeCamera.lookAt(target);
    this.controls.target.copy(target);
    this.controls.update();
  }

  public setGridVisible(visible: boolean) {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  public async syncSceneFromStore(storeItems: SceneItem[]) {
    const sceneItemsMap = new Map<string, THREE.Object3D>();
    this.scene.children.forEach(child => {
      if (child.userData?.isItem && child.uuid) {
        sceneItemsMap.set(child.uuid, child);
      }
    });

    for (const item of storeItems) {
      const sceneObj = sceneItemsMap.get(item.uuid);
      if (sceneObj) {
        sceneObj.position.fromArray(item.position);
        sceneObj.rotation.fromArray(item.rotation);
        sceneObj.scale.fromArray(item.scale);
        sceneItemsMap.delete(item.uuid);
        if (useAppStore.getState().selectedItemId === item.uuid && this.transformControl) {
           if (this.transformControl.object?.uuid !== item.uuid) this.transformControl.attach(sceneObj);
        }
      } else {
        if (item.type === 'model' && item.modelUrl) await this.recreateModel(item);
        else if (item.type === 'floor' && item.points) this.recreateFloor(item);
      }
    }
    for (const [uuid, obj] of sceneItemsMap) {
      this.scene.remove(obj);
      if (this.transformControl?.object?.uuid === uuid) this.transformControl.detach();
    }
  }

  private async recreateModel(item: SceneItem) {
    if (!item.modelUrl) return;
    try {
      let model: THREE.Group;
      if (this.assetCache[item.modelUrl]) model = this.assetCache[item.modelUrl].clone();
      else {
        const gltf = await this.loader.loadAsync(item.modelUrl);
        this.assetCache[item.modelUrl] = gltf.scene;
        model = gltf.scene.clone();
      }
      model.uuid = item.uuid; 
      model.position.fromArray(item.position);
      model.rotation.fromArray(item.rotation);
      model.scale.fromArray(item.scale);
      model.userData.isItem = true;
      model.userData.productId = item.productId;
      model.userData.type = item.type;
      model.traverse((child) => { if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true; }});
      this.scene.add(model);
    } catch (e) { console.error(e); }
  }

  private recreateFloor(item: SceneItem) {
    if (!item.points || item.points.length < 3) return;
    const floorDepth = 0.1;
    const shape = new THREE.Shape();
    shape.moveTo(item.points[0].x, item.points[0].z);
    for (let i = 1; i < item.points.length; i++) shape.lineTo(item.points[i].x, item.points[i].z);
    shape.lineTo(item.points[0].x, item.points[0].z);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: floorDepth, bevelEnabled: false });
    const material = new THREE.MeshStandardMaterial({ color: 0xA04040, roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    mesh.position.fromArray(item.position);
    mesh.rotation.fromArray(item.rotation);
    mesh.scale.fromArray(item.scale);
    mesh.receiveShadow = true;
    mesh.userData.isItem = true;
    mesh.userData.type = 'floor';
    mesh.userData.productId = item.productId;
    this.scene.add(mesh);
  }

  public onMouseDown = (event: MouseEvent) => {
    if (this.transformControl && this.isDraggingGizmo) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.activeCamera);

    const store = useAppStore.getState();
    const mode = store.mode;

    if (mode === 'drawing_floor') {
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        if (event.button === 0) this.addDraftPoint(point);
        else if (event.button === 2) {
          if (this.floorPoints.length >= 3) this.createSolidFloor();
        }
      }
      return;
    }

    if (mode === 'placing_item' && store.selectedProduct) {
      if (event.button !== 0) return;
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        this.placeObject(intersects[0].point.x, intersects[0].point.z, store.selectedProduct);
      }
      return;
    }

    if (mode === 'idle' || mode === 'editing') {
      if (event.button !== 0) return;
      const interactables = this.scene.children.filter(obj => obj.userData?.isItem && obj !== this.transformControl);
      const intersects = this.raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.isItem && target.parent && target.parent !== this.scene) {
          target = target.parent;
        }
        if (target && target.userData?.isItem) this.selectObject(target);
        else if (this.transformControl?.object && this.transformControl.object.uuid !== target?.uuid) this.selectObject(null);
      } else if (this.transformControl?.object) {
        this.selectObject(null);
      }
    }
  }

  private addDraftPoint(point: THREE.Vector3) {
    const p = point.clone();
    p.y = 0.05; 
    this.floorPoints.push(p);

    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.floorMarkers.push(marker);

    if (this.previewLine) this.scene.remove(this.previewLine);
    if (this.floorPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.floorPoints);
      this.previewLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x9b59b6 }));
      this.scene.add(this.previewLine);
    }
  }

  private createSolidFloor() {
    if (this.floorPoints.length < 3) return;
    const floorDepth = 0.1;
    const shape = new THREE.Shape();
    const points2D = this.floorPoints.map(p => ({ x: p.x, z: p.z }));

    shape.moveTo(this.floorPoints[0].x, this.floorPoints[0].z);
    for (let i = 1; i < this.floorPoints.length; i++) shape.lineTo(this.floorPoints[i].x, this.floorPoints[i].z);
    shape.lineTo(this.floorPoints[0].x, this.floorPoints[0].z);
    
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: floorDepth, bevelEnabled: false });
    const material = new THREE.MeshStandardMaterial({ color: 0xA04040, roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2; 
    mesh.position.y = floorDepth; 
    mesh.receiveShadow = true;
    mesh.userData.isItem = true;
    mesh.userData.type = 'floor';
    mesh.uuid = THREE.MathUtils.generateUUID();
    this.scene.add(mesh);

    useAppStore.getState().addItem({
      uuid: mesh.uuid,
      productId: 'custom_floor',
      name: 'Suelo a medida',
      price: 100,
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotation: [Math.PI / 2, 0, 0], 
      scale: [1, 1, 1],
      type: 'floor',
      points: points2D
    });

    this.floorPoints = [];
    this.floorMarkers.forEach(m => this.scene.remove(m));
    this.floorMarkers = [];
    if (this.previewLine) { this.scene.remove(this.previewLine); this.previewLine = null; }
    useAppStore.getState().setMode('idle');
  }

  public async placeObject(x: number, z: number, product: PlaceableProduct) {
    if (!product.modelUrl) return;
    const url = product.modelUrl; 
    let model: THREE.Group;

    if (this.assetCache[url]) model = this.assetCache[url].clone();
    else {
        try {
            const gltf = await this.loader.loadAsync(url);
            this.assetCache[url] = gltf.scene;
            model = gltf.scene.clone();
        } catch (e) { console.error(e); return; }
    }

    model.position.set(x, 0, z);
    const initialScale = product.initialScale ? new THREE.Vector3(...product.initialScale) : new THREE.Vector3(1, 1, 1);
    model.scale.copy(initialScale);
    model.updateMatrixWorld(true); 
    this.adjustObjectToGround(model);
    model.traverse((child) => { if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true; }});

    this.scene.add(model);
    
    const targetScale = model.scale.clone();
    model.scale.set(0, 0, 0);
    let t = 0;
    const animateEntry = () => {
      t += 0.05;
      if (t <= 1) { model.scale.lerpVectors(new THREE.Vector3(0,0,0), targetScale, t); requestAnimationFrame(animateEntry); }
      else model.scale.copy(targetScale);
    };
    animateEntry();

    model.userData.isItem = true;
    model.userData.productId = product.id;
    model.userData.type = product.type;
    model.uuid = THREE.MathUtils.generateUUID();

    useAppStore.getState().addItem({
      uuid: model.uuid,
      productId: product.id,
      name: product.name,
      price: product.price,
      position: [x, model.position.y, z],
      rotation: [0, 0, 0],
      scale: [initialScale.x, initialScale.y, initialScale.z],
      type: 'model',
      modelUrl: url 
    });

    this.selectObject(model);
    useAppStore.getState().setMode('idle');
  }

  private adjustObjectToGround(object: THREE.Object3D) {
    object.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(object);
    const bottomY = box.min.y;
    object.position.y -= bottomY;
  }

  public selectObject(object: THREE.Object3D | null) {
    if (!this.transformControl) { useAppStore.getState().selectItem(null); return; }
    if (object && this.transformControl.object?.uuid === object.uuid) {
        if (useAppStore.getState().selectedItemId !== object.uuid) useAppStore.getState().selectItem(object.uuid);
        return;
    }
    if (this.transformControl.object) { this.transformControl.detach(); this.transformControl.visible = false; this.controls.enabled = true; }
    if (!object) { useAppStore.getState().selectItem(null); return; }
    this.transformControl.attach(object);
    this.transformControl.visible = true;
    this.controls.enabled = false;
    useAppStore.getState().selectItem(object.uuid);
  }

  private syncTransformToStore(obj: THREE.Object3D) {
    if (this.transformControl?.object?.uuid === obj.uuid && obj.userData.isItem) {
      useAppStore.getState().updateItemTransform(
        obj.uuid, [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z], [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    }
  }

  public deleteSelected() {
    if (!this.transformControl || !this.transformControl.object) return;
    const obj = this.transformControl.object;
    this.transformControl.detach(); this.transformControl.visible = false;
    this.scene.remove(obj);
    this.controls.enabled = true;
    useAppStore.getState().removeItem(obj.uuid);
    useAppStore.getState().selectItem(null);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.transformControl || !this.transformControl.object || !this.transformControl.visible) return;
    if (useAppStore.getState().mode !== 'editing') return;
    if (!this.transformControl.enabled) this.transformControl.enabled = true;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); useAppStore.getState().undo(); return; } 

    switch (e.key.toLowerCase()) {
      case 't': this.transformControl.setMode('translate'); break;
      case 'r': this.transformControl.setMode('rotate'); break;
      case 'e': this.transformControl.setMode('scale'); break;
      case 'delete': case 'backspace': e.preventDefault(); this.deleteSelected(); break;
    }
  }

  private createInteractionPlane() {
    const geo = new THREE.PlaneGeometry(1000, 1000);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
    return plane;
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.perspectiveCamera.aspect = width / height;
    this.perspectiveCamera.updateProjectionMatrix();

    const frustumSize = 20;
    const aspect = width / height;
    this.orthoCamera.left = -frustumSize * aspect / 2;
    this.orthoCamera.right = frustumSize * aspect / 2;
    this.orthoCamera.top = frustumSize / 2;
    this.orthoCamera.bottom = -frustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public init() { this.animate(); }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }

  public dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onWindowResize);
    try { this.container.removeChild(this.renderer.domElement); } catch (e) {}
    try { this.renderer.dispose(); } catch (e) {}
    if (this.transformControl) this.transformControl.dispose();
    if (this.controls) this.controls.dispose();
  }
}
// --- END OF FILE src/features/editor/engine/A42Engine.ts ---