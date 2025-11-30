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
  
  // Entorno
  private gridHelper: THREE.GridHelper | null = null;
  private dirLight: THREE.DirectionalLight | null = null;
  private sky: Sky | null = null;

  // Tools
  private floorPoints: THREE.Vector3[] = [];
  private floorMarkers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;
  private floorEditMarkers: THREE.Mesh[] = [];
  private activeFloorId: string | null = null;
  private measurePoints: THREE.Vector3[] = [];
  private measureLine: THREE.Line | null = null;
  private measureMarkers: THREE.Mesh[] = [];

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
      frustumSize * aspect / -2, frustumSize * aspect / 2,
      frustumSize / 2, frustumSize / -2, 0.1, 1000
    );
    this.orthoCamera.position.set(20, 20, 20);
    this.orthoCamera.lookAt(0, 0, 0);

    this.activeCamera = this.perspectiveCamera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
            const obj = this.transformControl?.object;
            if (obj) {
                if (obj.userData.isFloorMarker) this.updateFloorFromMarkers(obj);
                else if (obj.userData.isItem) {
                    this.adjustObjectToGround(obj);
                    this.syncTransformToStore(obj);
                }
            }
          }
        });
        
        this.transformControl.addEventListener('objectChange', () => {
           const obj = this.transformControl?.object;
           if (obj && obj.userData.isItem && !this.isDraggingGizmo) {
               this.adjustObjectToGround(obj);
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

  // --- MÉTODOS DE LIMPIEZA ---
  public clearTools() {
    this.measureMarkers.forEach(m => this.scene.remove(m));
    this.measureMarkers = [];
    if (this.measureLine) { this.scene.remove(this.measureLine); this.measureLine = null; }
    this.measurePoints = [];
    
    this.floorMarkers.forEach(m => this.scene.remove(m));
    this.floorMarkers = [];
    if (this.previewLine) { this.scene.remove(this.previewLine); this.previewLine = null; }
    this.floorPoints = [];

    if (useAppStore.getState().mode !== 'editing') {
        this.clearFloorEditMarkers();
        this.activeFloorId = null;
        if (this.transformControl) this.transformControl.detach();
    }
  }

  // --- RECREAR SUELO (CORREGIDO ESPEJO) ---
  private recreateFloor(item: SceneItem) {
    if (!item.points || item.points.length < 3) return;
    
    const shape = new THREE.Shape();
    
    // CORRECCIÓN CRÍTICA: Invertimos la Z (-item.points[i].z)
    // Al rotar -90 grados en X, esto hará que coincida con la Z positiva del mundo.
    shape.moveTo(item.points[0].x, -item.points[0].z);
    for (let i = 1; i < item.points.length; i++) {
        shape.lineTo(item.points[i].x, -item.points[i].z);
    }
    shape.lineTo(item.points[0].x, -item.points[0].z);
    
    const floorDepth = 0.05;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: floorDepth, bevelEnabled: false });

    // Rotamos la geometría para que esté plana en el suelo
    geometry.rotateX(-Math.PI / 2);
    // Ajustamos altura para que crezca hacia arriba desde 0
    geometry.translate(0, 0, 0); 

    // Corrección de UVs
    const posAttribute = geometry.attributes.position;
    const uvAttribute = geometry.attributes.uv;
    
    const scale = item.textureScale || 1;
    const rotationRad = THREE.MathUtils.degToRad(item.textureRotation || 0);
    const cosR = Math.cos(rotationRad);
    const sinR = Math.sin(rotationRad);

    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const z = posAttribute.getZ(i); // Ahora Z es correcto en el mundo
        
        const u = (x * cosR - z * sinR) / scale;
        const v = (x * sinR + z * cosR) / scale;
        
        uvAttribute.setXY(i, u, v);
    }

    let material: THREE.Material;
    if (item.textureUrl) {
        const texLoader = new THREE.TextureLoader();
        const texture = texLoader.load(item.textureUrl);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide });
    } else {
        let matColor = 0xA04040;
        switch (item.floorMaterial) {
            case 'rubber_green': matColor = 0x22c55e; break;
            case 'rubber_blue': matColor = 0x3b82f6; break;
            case 'grass': matColor = 0x4ade80; break; 
            case 'concrete': matColor = 0x9ca3af; break;
            default: matColor = 0xA04040; break;
        }
        material = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.8, side: THREE.DoubleSide });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    
    // Posición 0,0,0 absoluta (la geometría ya tiene las coordenadas correctas)
    mesh.position.set(0, 0, 0); 
    mesh.rotation.set(0, 0, 0);
    
    mesh.receiveShadow = true;
    
    mesh.userData.isItem = true;
    mesh.userData.type = 'floor';
    mesh.userData.productId = item.productId;
    mesh.userData.points = item.points; 
    mesh.userData.floorMaterial = item.floorMaterial;
    mesh.userData.textureUrl = item.textureUrl;
    mesh.userData.textureScale = item.textureScale;
    mesh.userData.textureRotation = item.textureRotation;

    this.scene.add(mesh);

    if (this.activeFloorId === item.uuid && useAppStore.getState().mode === 'editing') {
        this.showFloorEditMarkers(item);
    }
  }

  // --- RESTO DEL ENGINE ---

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

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
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
    if (this.sky) { this.sky.visible = visible; this.scene.background = null; }
  }

  public async syncSceneFromStore(storeItems: SceneItem[]) {
    const sceneItemsMap = new Map<string, THREE.Object3D>();
    this.scene.children.forEach(child => {
      if (child.userData?.isItem && child.uuid) sceneItemsMap.set(child.uuid, child);
    });

    for (const item of storeItems) {
      const sceneObj = sceneItemsMap.get(item.uuid);
      if (sceneObj) {
        if (item.type === 'floor') {
            const hasChanged = 
                JSON.stringify(sceneObj.userData.points) !== JSON.stringify(item.points) ||
                sceneObj.userData.floorMaterial !== item.floorMaterial ||
                sceneObj.userData.textureUrl !== item.textureUrl ||
                sceneObj.userData.textureScale !== item.textureScale ||
                sceneObj.userData.textureRotation !== item.textureRotation;
            
            if (hasChanged) {
                this.scene.remove(sceneObj);
                this.recreateFloor(item);
                sceneItemsMap.delete(item.uuid);
                continue; 
            }
        }
        sceneObj.position.fromArray(item.position);
        sceneObj.rotation.fromArray(item.rotation);
        sceneObj.scale.fromArray(item.scale);
        sceneItemsMap.delete(item.uuid);
      } else {
        if (item.type === 'model' && item.modelUrl) await this.recreateModel(item);
        else if (item.type === 'floor' && item.points) this.recreateFloor(item);
      }
    }

    for (const [uuid, obj] of sceneItemsMap) {
      this.scene.remove(obj);
      if (this.transformControl?.object?.uuid === uuid) this.transformControl.detach();
      if (this.activeFloorId === uuid) { this.activeFloorId = null; this.clearFloorEditMarkers(); }
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
        if (event.button === 0) this.addDraftPoint(intersects[0].point);
        else if (event.button === 2) { if (this.floorPoints.length >= 3) this.createSolidFloor(); }
      }
      return;
    }

    if (mode === 'measuring') {
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hit = intersects.find(i => i.object.visible && (i.object.userData.isItem || i.object === this.interactionPlane));
        if (hit) this.handleMeasurementClick(hit.point);
        else {
            const planeIntersect = this.raycaster.intersectObject(this.interactionPlane);
            if (planeIntersect.length > 0) this.handleMeasurementClick(planeIntersect[0].point);
        }
        return;
    }

    if (mode === 'placing_item' && store.selectedProduct) {
      if (event.button !== 0) return;
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) this.placeObject(intersects[0].point.x, intersects[0].point.z, store.selectedProduct);
      return;
    }

    if (mode === 'idle' || mode === 'editing') {
      if (event.button !== 0) return;

      if (this.floorEditMarkers.length > 0) {
          const markerIntersects = this.raycaster.intersectObjects(this.floorEditMarkers);
          if (markerIntersects.length > 0) {
              if (this.transformControl) {
                  this.transformControl.attach(markerIntersects[0].object);
                  this.transformControl.setMode('translate');
                  this.transformControl.visible = true;
                  this.controls.enabled = false;
              }
              return;
          }
      }

      const interactables = this.scene.children.filter(obj => obj.userData?.isItem && obj !== this.transformControl);
      const intersects = this.raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.isItem && target.parent && target.parent !== this.scene) target = target.parent;

        if (target && target.userData?.isItem) {
            this.selectObject(target);
            if (target.userData.type === 'floor') {
                this.activeFloorId = target.uuid;
                const item = store.items.find(i => i.uuid === target.uuid);
                if (item) this.showFloorEditMarkers(item);
            } else {
                this.activeFloorId = null;
                this.clearFloorEditMarkers();
            }
        }
      } else {
        if (this.transformControl?.object && !this.floorEditMarkers.includes(this.transformControl.object as THREE.Mesh)) {
            this.selectObject(null);
            this.activeFloorId = null;
            this.clearFloorEditMarkers();
        }
      }
    }
  }

  private addDraftPoint(point: THREE.Vector3) {
    const p = point.clone();
    p.y = 0.05; 
    if (this.floorPoints.length > 0 && p.distanceTo(this.floorPoints[this.floorPoints.length - 1]) < 0.1) return;
    
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
    const points2D = this.floorPoints.map(p => ({ x: p.x, z: p.z }));
    useAppStore.getState().addItem({
      uuid: THREE.MathUtils.generateUUID(),
      productId: 'custom_floor',
      name: 'Suelo a medida',
      price: 100,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      type: 'floor',
      points: points2D,
      floorMaterial: 'rubber_red'
    });
    this.clearTools();
    useAppStore.getState().setMode('idle');
  }

  private showFloorEditMarkers(item: SceneItem) {
    this.clearFloorEditMarkers();
    if (!item.points) return;
    item.points.forEach((pt, index) => {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 }));
        marker.position.set(pt.x, 0.0, pt.z);
        marker.userData.isFloorMarker = true;
        marker.userData.pointIndex = index;
        marker.userData.parentUuid = item.uuid;
        this.scene.add(marker);
        this.floorEditMarkers.push(marker);
    });
  }

  private clearFloorEditMarkers() {
    this.floorEditMarkers.forEach(m => this.scene.remove(m));
    this.floorEditMarkers = [];
  }

  private updateFloorFromMarkers(marker: THREE.Object3D) {
    const uuid = marker.userData.parentUuid;
    const idx = marker.userData.pointIndex;
    const items = useAppStore.getState().items;
    const floorItem = items.find(i => i.uuid === uuid);
    if (floorItem && floorItem.points) {
        const newPoints = floorItem.points.map(p => ({...p}));
        newPoints[idx] = { x: marker.position.x, z: marker.position.z };
        useAppStore.getState().updateFloorPoints(uuid, newPoints);
    }
  }

  private handleMeasurementClick(point: THREE.Vector3) {
    const p = point.clone();
    p.y += 0.05;
    this.measurePoints.push(p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.measureMarkers.push(marker);

    if (this.measurePoints.length === 2) {
        const dist = this.measurePoints[0].distanceTo(this.measurePoints[1]);
        const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2, depthTest: false });
        const geometry = new THREE.BufferGeometry().setFromPoints(this.measurePoints);
        this.measureLine = new THREE.Line(geometry, material);
        this.scene.add(this.measureLine);
        useAppStore.getState().setMeasurementResult(dist);
    } else if (this.measurePoints.length > 2) {
        this.clearTools(); 
        this.handleMeasurementClick(point);
    }
  }

  public placeObject(x: number, z: number, product: PlaceableProduct) {
      this.placeObjectInternal(x, z, product);
  }
  
  private async placeObjectInternal(x: number, z: number, product: PlaceableProduct) {
    if (!product.modelUrl) return;
    let model: THREE.Group;
    if (this.assetCache[product.modelUrl]) model = this.assetCache[product.modelUrl].clone();
    else {
        try {
            const gltf = await this.loader.loadAsync(product.modelUrl);
            this.assetCache[product.modelUrl!] = gltf.scene;
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
    
    // Animación de entrada
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
      modelUrl: product.modelUrl
    });

    this.selectObject(model);
    useAppStore.getState().setMode('idle');
  }

  private adjustObjectToGround(object: THREE.Object3D) {
    object.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(object);
    object.position.y -= box.min.y;
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

  public setGizmoMode(mode: 'translate' | 'rotate' | 'scale') { if (this.transformControl) this.transformControl.setMode(mode); }
  public switchCamera(type: 'perspective' | 'orthographic') { 
      const oldPos = this.activeCamera.position.clone();
      const target = this.controls.target.clone();
      if (type === 'orthographic') { this.activeCamera = this.orthoCamera; } 
      else { this.activeCamera = this.perspectiveCamera; }
      this.activeCamera.position.copy(oldPos);
      this.activeCamera.lookAt(target);
      this.controls.object = this.activeCamera;
      if (this.transformControl) this.transformControl.camera = this.activeCamera;
  }
  public setView(view: CameraView) {
    const d = 20; const t = new THREE.Vector3(0,0,0); let p = new THREE.Vector3();
    if (view === 'top') p.set(0, d, 0); else if (view === 'front') p.set(0, 0, d); else if (view === 'side') p.set(d, 0, 0); else p.set(d, d, d);
    this.activeCamera.position.copy(p); this.activeCamera.lookAt(t); this.controls.target.copy(t); this.controls.update();
  }
  public setGridVisible(v: boolean) { if (this.gridHelper) this.gridHelper.visible = v; }
  private createInteractionPlane() { 
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ visible: false })); 
      plane.rotation.x = -Math.PI / 2; this.scene.add(plane); return plane; 
  }
  private onKeyDown = (e: KeyboardEvent) => {
      if (useAppStore.getState().mode !== 'editing') return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); useAppStore.getState().undo(); return; }
      if (!this.transformControl?.visible) return;
      if (e.key === 't') this.transformControl.setMode('translate');
      else if (e.key === 'r') this.transformControl.setMode('rotate');
      else if (e.key === 'e') this.transformControl.setMode('scale');
      else if (e.key === 'Delete' || e.key === 'Backspace') { 
          const obj = this.transformControl.object;
          if (obj && !obj.userData.isFloorMarker) { 
            this.transformControl.detach(); this.transformControl.visible = false; 
            this.scene.remove(obj); this.controls.enabled = true; 
            useAppStore.getState().removeItem(obj.uuid); 
            useAppStore.getState().selectItem(null); 
            this.activeFloorId = null; this.clearFloorEditMarkers();
          }
      }
  }
  private onWindowResize = () => {
      if(!this.container) return;
      const w = this.container.clientWidth; const h = this.container.clientHeight;
      this.perspectiveCamera.aspect = w/h; this.perspectiveCamera.updateProjectionMatrix();
      const a = w/h; const s = 20;
      this.orthoCamera.left = -s*a/2; this.orthoCamera.right = s*a/2; this.orthoCamera.top = s/2; this.orthoCamera.bottom = -s/2;
      this.orthoCamera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
  }
  public init() { this.animate(); }
  private animate = () => { this.animationId = requestAnimationFrame(this.animate); this.controls.update(); this.renderer.render(this.scene, this.activeCamera); }
  public dispose() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('resize', this.onWindowResize);
      try { this.container.removeChild(this.renderer.domElement); } catch (e) {}
      this.renderer.dispose();
  }
}
// --- END OF FILE src/features/editor/engine/A42Engine.ts ---