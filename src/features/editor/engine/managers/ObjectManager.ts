// --- START OF FILE src/features/editor/engine/managers/ObjectManager.ts ---
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAppStore } from '../../../../stores/useAppStore';
import type { SceneItem, ProductDefinition, FenceConfig, FloorMaterialType } from '../../../../stores/useAppStore';
import { FENCE_PRESETS } from '../../data/fence_presets';

type PlaceableProduct = ProductDefinition & { initialScale?: [number, number, number] };

export class ObjectManager {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private assetCache: { [url: string]: THREE.Group } = {};
  
  // Materiales de suelo predefinidos para no crearlos cada vez
  private floorMaterials: Record<FloorMaterialType, THREE.Material>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();

    this.floorMaterials = {
        'rubber_red': new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9 }),
        'rubber_green': new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.9 }),
        'rubber_blue': new THREE.MeshStandardMaterial({ color: 0x00008b, roughness: 0.9 }),
        'grass': new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1 }),
        'concrete': new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 }),
    };
  }

  // --- CARGA DE MODELOS (CON CACHÉ) ---
  public async loadModel(url: string): Promise<THREE.Group> {
      if (this.assetCache[url]) {
          return this.assetCache[url].clone();
      }
      const gltf = await this.loader.loadAsync(url);
      this.assetCache[url] = gltf.scene;
      return gltf.scene.clone();
  }

  // --- RECREAR MODELO DESDE STORE ---
  public async recreateModel(item: SceneItem) {
    if (!item.modelUrl) return;
    try {
      const model = await this.loadModel(item.modelUrl);
      
      // Configuración básica
      model.uuid = item.uuid; 
      model.position.fromArray(item.position);
      model.rotation.fromArray(item.rotation);
      model.scale.fromArray(item.scale);
      model.userData = { isItem: true, type: 'model', uuid: item.uuid, productId: item.productId };

      // --- LÓGICA DE ZONAS DE SEGURIDAD ---
      const safetyZoneMat = new THREE.MeshBasicMaterial({ 
          color: 0xff0000, 
          transparent: true, 
          opacity: 0.3, 
          depthWrite: false,
          side: THREE.DoubleSide
      });
      const isZonesVisible = useAppStore.getState().safetyZonesVisible;

      model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Detectar si es una zona de seguridad por nombre
              const name = mesh.name.toLowerCase();
              const matName = (mesh.material as THREE.Material).name?.toLowerCase() || '';

              if (name.includes('zona') || name.includes('seguridad') || name.includes('safety') ||
                  matName.includes('zona') || matName.includes('seguridad') || matName.includes('safety')) {
                  
                  mesh.material = safetyZoneMat.clone();
                  mesh.userData.isSafetyZone = true;
                  mesh.castShadow = false;
                  mesh.receiveShadow = false;
                  mesh.visible = isZonesVisible; // Inicializar según estado del botón
              }
          }
      });
      // -------------------------------------

      this.scene.add(model);
    } catch (e) { console.error(e); }
  }

  // --- RECREAR SUELO ---
  public recreateFloor(item: SceneItem) {
    if (!item.points || item.points.length < 3) return;
    
    const shape = new THREE.Shape();
    shape.moveTo(item.points[0].x, -item.points[0].z);
    for (let i = 1; i < item.points.length; i++) {
        shape.lineTo(item.points[i].x, -item.points[i].z);
    }
    shape.lineTo(item.points[0].x, -item.points[0].z); // Cerrar
    
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2); // Poner plano en el suelo

    // Mapeo UV para texturas
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
        const texture = this.textureLoader.load(item.textureUrl);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide });
    } else {
        material = this.floorMaterials[item.floorMaterial || 'concrete'];
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    mesh.position.set(0, 0, 0); 
    mesh.receiveShadow = true;
    
    mesh.userData = { 
        isItem: true, 
        type: 'floor', 
        uuid: item.uuid, 
        points: item.points, 
        floorMaterial: item.floorMaterial,
        textureUrl: item.textureUrl,
        textureScale: item.textureScale,
        textureRotation: item.textureRotation
    };

    this.scene.add(mesh);
  }

  // --- RECREAR VALLA (Geometría Instanciada) ---
  public createFenceObject(points: THREE.Vector3[], config: FenceConfig): THREE.Group | null {
      if (!points || points.length < 2) return null;

      const preset = FENCE_PRESETS[config.presetId] || FENCE_PRESETS["wood"];
      const colors = config.colors;
      
      const partsData: any = {};
      const helperObj = new THREE.Object3D();

      const registerPart = (key: string, geometry: THREE.BufferGeometry, position: THREE.Vector3, rotation: THREE.Euler, scale: {x?: number, y?: number, z?: number}, colorHex: number) => {
          if (!partsData[key]) {
              partsData[key] = { geometry, matrices: [], colors: [] };
          }
          helperObj.position.copy(position);
          helperObj.rotation.copy(rotation);
          helperObj.scale.set(scale.x || 1, scale.y || 1, scale.z || 1);
          helperObj.updateMatrix();
          
          partsData[key].matrices.push(helperObj.matrix.clone());
          const col = new THREE.Color(colorHex);
          partsData[key].colors.push(col.r, col.g, col.b);
      };

      // --- CONSTRUCCIÓN PROCEDURAL ---
      let postGeo: THREE.BufferGeometry;
      if (preset.postType === "round") postGeo = new THREE.CylinderGeometry(preset.postRadius, preset.postRadius, preset.postHeight, 12);
      else postGeo = new THREE.BoxGeometry(preset.postWidth, preset.postHeight, preset.postWidth);
      postGeo.translate(0, preset.postHeight/2, 0); 

      let railGeo: THREE.BufferGeometry | null = null;
      if (preset.railType === "frame") {
          if (preset.railShape === 'square') railGeo = new THREE.BoxGeometry(preset.railThickness, preset.railThickness, 1);
          else { railGeo = new THREE.CylinderGeometry(preset.railRadius, preset.railRadius, 1, 8); railGeo.rotateX(Math.PI / 2); }
      }
      const slatGeo = new THREE.BoxGeometry(preset.slatThickness, 1, preset.slatWidth);

      const topRailY = preset.postHeight - 0.15; 
      const botRailY = 0.15; 
      const slatHeight = topRailY - botRailY - (preset.railShape === 'square' ? (preset.railThickness || 0) : (preset.railRadius || 0)*2);
      const slatCenterY = (topRailY + botRailY) / 2;
      const slatColors = [colors.slatA, colors.slatB || colors.slatA, colors.slatC || colors.slatA];

      for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i+1];
          const dist = start.distanceTo(end);
          
          const dir = new THREE.Vector3().subVectors(end, start).normalize();
          const angle = Math.atan2(dir.x, dir.z);
          const moduleLength = 2.0; 
          const modulesCount = Math.ceil(dist / moduleLength); 
          const actualModuleLen = dist / modulesCount;

          for (let m = 0; m < modulesCount; m++) {
              const tStart = m / modulesCount;
              const tEnd = (m + 1) / modulesCount;
              const modStart = new THREE.Vector3().lerpVectors(start, end, tStart);
              const modEnd = new THREE.Vector3().lerpVectors(start, end, tEnd);
              const modCenter = new THREE.Vector3().lerpVectors(modStart, modEnd, 0.5);

              // POSTE
              registerPart('post', postGeo, modStart, new THREE.Euler(0,0,0), {}, colors.post);

              // RIELES Y LAMAS
              const postThickness = (preset.postType==='round' ? (preset.postRadius || 0.05)*2 : (preset.postWidth || 0.1));
              const railLen = actualModuleLen - postThickness + 0.02;

              if (preset.railType === "frame" && railGeo) {
                  registerPart('rail', railGeo, new THREE.Vector3(modCenter.x, topRailY, modCenter.z), new THREE.Euler(0, angle, 0), {x:1, y:1, z: railLen}, colors.post);
                  registerPart('rail', railGeo, new THREE.Vector3(modCenter.x, botRailY, modCenter.z), new THREE.Euler(0, angle, 0), {x:1, y:1, z: railLen}, colors.post);
              }

              // LAMAS
              if (preset.isSolidPanel) {
                  const pWidth = railLen - 0.02;
                  registerPart('slat', slatGeo, new THREE.Vector3(modCenter.x, slatCenterY, modCenter.z), new THREE.Euler(0, angle, 0), {x:1, y:slatHeight, z: pWidth/preset.slatWidth}, slatColors[0]);
              } else {
                  let slatCount;
                  if (preset.fixedCount) {
                      slatCount = preset.fixedCount;
                      const totalSlatWidth = slatCount * preset.slatWidth;
                      const dynamicGap = (railLen - totalSlatWidth) / (slatCount + 1);
                      const gapStartT = (postThickness / 2) / actualModuleLen;
                      const gapEndT = 1 - ((postThickness / 2) / actualModuleLen);

                      for (let k = 0; k < slatCount; k++) {
                          const tGlobal = gapStartT + ((dynamicGap + (preset.slatWidth/2) + (k*(preset.slatWidth+dynamicGap))) / railLen * (gapEndT - gapStartT));
                          const slatPos = new THREE.Vector3().lerpVectors(modStart, modEnd, tGlobal);
                          slatPos.y = slatCenterY;
                          registerPart('slat', slatGeo, slatPos, new THREE.Euler(0, angle, 0), {x:1, y:slatHeight, z:1}, slatColors[k % 3]);
                      }
                  } else {
                      const unitWidth = preset.slatWidth + (preset.slatGap || 0);
                      slatCount = Math.floor(railLen / unitWidth);
                      const startOffset = (actualModuleLen - (slatCount * unitWidth)) / 2;
                      for (let k = 0; k < slatCount; k++) {
                          const relativeT = (startOffset + (k * unitWidth) + (preset.slatWidth/2)) / actualModuleLen;
                          const slatPos = new THREE.Vector3().lerpVectors(modStart, modEnd, relativeT);
                          slatPos.y = slatCenterY;
                          registerPart('slat', slatGeo, slatPos, new THREE.Euler(0, angle, 0), {x:1, y:slatHeight, z:1}, slatColors[k % 3]);
                      }
                  }
              }
          }
      }
      
      // Poste final
      registerPart('post', postGeo, points[points.length-1], new THREE.Euler(0,0,0), {}, colors.post);

      const fenceGroup = new THREE.Group();
      const commonMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }); 
      commonMat.color.setHex(0xffffff);

      for (const [_key, data] of Object.entries(partsData) as any) {
          const count = data.matrices.length;
          const instancedMesh = new THREE.InstancedMesh(data.geometry, commonMat, count);
          instancedMesh.castShadow = true;
          instancedMesh.receiveShadow = true;

          for (let i = 0; i < count; i++) {
              instancedMesh.setMatrixAt(i, data.matrices[i]);
              instancedMesh.setColorAt(i, new THREE.Color(data.colors[i*3], data.colors[i*3+1], data.colors[i*3+2]));
          }
          instancedMesh.instanceMatrix.needsUpdate = true;
          if(instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
          fenceGroup.add(instancedMesh);
      }
      
      return fenceGroup;
  }

  public recreateFence(item: SceneItem) {
      if (!item.points || !item.fenceConfig) return;
      const points = item.points.map(p => new THREE.Vector3(p.x, 0, p.z));
      const fence = this.createFenceObject(points, item.fenceConfig);
      if (fence) {
          fence.uuid = item.uuid;
          fence.userData.isItem = true;
          fence.userData.type = 'fence';
          fence.userData.productId = item.productId;
          // Guardamos datos originales para exportación DXF
          fence.userData.points = item.points;
          fence.userData.fenceConfig = item.fenceConfig;
          this.scene.add(fence);
      }
  }

  // --- COLOCAR OBJETO NUEVO ---
  public async placeObject(x: number, z: number, product: PlaceableProduct, afterPlace?: (uuid: string) => void) {
      if (!product.modelUrl) return;
      try {
          const model = await this.loadModel(product.modelUrl);
          model.position.set(x, 0, z);
          
          const initialScale = product.initialScale ? new THREE.Vector3(...product.initialScale) : new THREE.Vector3(1, 1, 1);
          model.scale.copy(initialScale);
          model.updateMatrixWorld(true);
          
          this.adjustObjectToGround(model);
          
          // Configuración inicial de sombras y zonas
          const safetyZoneMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
          const isZonesVisible = useAppStore.getState().safetyZonesVisible;

          model.traverse((child) => { 
              if ((child as THREE.Mesh).isMesh) { 
                  const mesh = child as THREE.Mesh;
                  mesh.castShadow = true; 
                  mesh.receiveShadow = true; 

                  // Check Zonas
                  const name = mesh.name.toLowerCase();
                  const matName = (mesh.material as THREE.Material).name?.toLowerCase() || '';
                  if (name.includes('zona') || name.includes('seguridad') || name.includes('safety') ||
                      matName.includes('zona') || matName.includes('seguridad') || matName.includes('safety')) {
                      mesh.material = safetyZoneMat.clone();
                      mesh.userData.isSafetyZone = true;
                      mesh.castShadow = false;
                      mesh.visible = isZonesVisible;
                  }
              }
          });

          this.scene.add(model);
          
          // Animación de entrada (Pop)
          const targetScale = model.scale.clone();
          model.scale.set(0, 0, 0);
          let t = 0;
          const animateEntry = () => {
            t += 0.05;
            if (t <= 1) { model.scale.lerpVectors(new THREE.Vector3(0,0,0), targetScale, t); requestAnimationFrame(animateEntry); }
            else model.scale.copy(targetScale);
          };
          animateEntry();
          
          // Guardar en Store
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
// --- END OF FILE src/features/editor/engine/managers/ObjectManager.ts ---