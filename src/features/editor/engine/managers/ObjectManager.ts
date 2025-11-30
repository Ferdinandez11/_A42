// --- START OF FILE src/features/editor/engine/managers/ObjectManager.ts ---
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// 1. Importamos la función (Valor real)
import { useAppStore } from '../../../../stores/useAppStore';

// 2. Importamos las interfaces con 'import type' (Solo existen en código, no en navegador)
import type { SceneItem, ProductDefinition } from '../../../../stores/useAppStore';

type PlaceableProduct = ProductDefinition & { initialScale?: [number, number, number] };

export class ObjectManager {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private assetCache: { [url: string]: THREE.Group } = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  public async loadModel(url: string): Promise<THREE.Group> {
      if (this.assetCache[url]) {
          return this.assetCache[url].clone();
      }
      const gltf = await this.loader.loadAsync(url);
      this.assetCache[url] = gltf.scene;
      return gltf.scene.clone();
  }

  public async recreateModel(item: SceneItem) {
    if (!item.modelUrl) return;
    try {
      const model = await this.loadModel(item.modelUrl);
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

  public recreateFloor(item: SceneItem) {
    if (!item.points || item.points.length < 3) return;
    
    const shape = new THREE.Shape();
    // Mismo código de lógica de suelo que en el original
    shape.moveTo(item.points[0].x, -item.points[0].z);
    for (let i = 1; i < item.points.length; i++) {
        shape.lineTo(item.points[i].x, -item.points[i].z);
    }
    shape.lineTo(item.points[0].x, -item.points[0].z);
    
    const floorDepth = 0.05;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: floorDepth, bevelEnabled: false });

    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, 0); 

    const posAttribute = geometry.attributes.position;
    const uvAttribute = geometry.attributes.uv;
    
    const scale = item.textureScale || 1;
    const rotationRad = THREE.MathUtils.degToRad(item.textureRotation || 0);
    const cosR = Math.cos(rotationRad);
    const sinR = Math.sin(rotationRad);

    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const z = posAttribute.getZ(i);
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
  }

  public async placeObject(x: number, z: number, product: PlaceableProduct, afterPlace?: (uuid: string) => void) {
      if (!product.modelUrl) return;
      try {
          const model = await this.loadModel(product.modelUrl);
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
            modelUrl: product.modelUrl
          });

          if(afterPlace) afterPlace(model.uuid);
          
      } catch (e) { console.error(e); }
  }

  public adjustObjectToGround(object: THREE.Object3D) {
    object.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(object);
    object.position.y -= box.min.y;
  }
}