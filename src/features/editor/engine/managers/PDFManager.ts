// --- START OF FILE src/features/editor/engine/managers/PDFManager.ts ---
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { A42Engine } from '../A42Engine';
import { useAppStore, type SceneItem } from '../../../../stores/useAppStore';

export class PDFManager {
  private engine: A42Engine;
  private visibilityCache: Map<string, boolean> = new Map();

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  public async generatePDF() {
    const doc = new jsPDF();
    const items = useAppStore.getState().items;
    const store = useAppStore.getState();

    const projectName = await store.requestInput("Nombre del Proyecto:", "Levipark21");
    if (!projectName) return;

    // --- SNAPSHOT INICIAL ---
    const originalCamPos = this.engine.activeCamera.position.clone();
    const originalRot = this.engine.activeCamera.rotation.clone();
    const activeCamTyped = this.engine.activeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const originalZoom = activeCamTyped.zoom;
    const originalBg = this.engine.scene.background;
    const originalFog = this.engine.scene.fog;

    // 1. CONFIGURACIÓN FONDO BLANCO
    this.engine.scene.background = new THREE.Color(0xffffff); 
    this.engine.scene.fog = null; // Sin niebla
    this.engine.renderer.setClearColor(0xffffff, 1); 
    this.engine.setGridVisible(false);
    this.engine.sceneManager.controls.enabled = false;

    // Guardamos estado de visibilidad
    this.cacheSceneVisibility();

    // 2. PORTADA (Ver items, ocultar grids/helpers)
    this.isolateSceneForCover(); 
    this.fitCameraToScene(); 
    const coverImg = this.takeHighResShot();

    // 3. VISTAS TÉCNICAS
    this.setShadows(false); 
    this.engine.switchCamera('orthographic');

    this.positionCamera('front');
    this.fitCameraToScene(true);
    const imgFront = this.takeHighResShot();
    
    this.positionCamera('side');
    this.fitCameraToScene(true);
    const imgSide = this.takeHighResShot();
    
    this.positionCamera('top');
    this.fitCameraToScene(true);
    const imgTop = this.takeHighResShot();
    
    this.positionCamera('iso');
    this.fitCameraToScene(true);
    const imgIso = this.takeHighResShot();

    // 4. FOTOS DE PRODUCTO (Aislamiento corregido)
    const uniqueItemsMap = new Map<string, SceneItem>();
    items.forEach(item => {
        const key = item.productId === 'custom_upload' ? item.uuid : item.productId;
        if (!uniqueItemsMap.has(key)) uniqueItemsMap.set(key, item);
    });

    const itemImages: Record<string, string> = {};
    
    this.engine.switchCamera('perspective'); 
    this.setShadows(true); 
    
    for (const [key, item] of uniqueItemsMap) {
        // Usamos la nueva lógica corregida
        this.isolateSingleItemAggressive(item.uuid);
        this.fitCameraToObject(item.uuid);
        itemImages[key] = this.takeHighResShot();
    }

    // --- RESTAURAR ESTADO ---
    this.restoreSceneVisibility();
    this.setShadows(true);
    
    this.engine.scene.background = originalBg; 
    this.engine.scene.fog = originalFog;
    this.engine.renderer.setClearColor(0x000000, 0); 
    
    this.engine.activeCamera.position.copy(originalCamPos);
    this.engine.activeCamera.rotation.copy(originalRot);
    (this.engine.activeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera).zoom = originalZoom;
    (this.engine.activeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();

    this.engine.sceneManager.controls.enabled = true;
    this.engine.switchCamera('perspective');
    this.engine.setGridVisible(useAppStore.getState().gridVisible);

    // --- FASE 2: MAQUETACIÓN PDF ---
    this.addHeader(doc, projectName, "Nuevo Parque");
    this.addImageFit(doc, coverImg, 20, 60, 170, 120);
    this.addFooter(doc);

    // PÁGINA 2
    doc.addPage();
    this.addHeader(doc, "Vistas Técnicas", "");
    doc.setFontSize(10);
    doc.text("Alzado", 20, 50);
    this.addImageFit(doc, imgFront, 20, 55, 80, 60);
    doc.text("Perfil", 110, 50);
    this.addImageFit(doc, imgSide, 110, 55, 80, 60);
    doc.text("Planta", 20, 130);
    this.addImageFit(doc, imgTop, 20, 135, 80, 60);
    doc.text("Isométrica", 110, 130);
    this.addImageFit(doc, imgIso, 110, 135, 80, 60);
    this.addFooter(doc);

    // PÁGINA 3
    doc.addPage();
    this.addHeader(doc, "Presupuesto", "");
    let totalBase = 0;
    const tableData = items.map(item => {
        let finalPrice = item.price || 0;
        let dims = "1 ud";
        if (item.type === 'floor') {
            const area = this.calculateArea(item);
            finalPrice = area * 35; 
            dims = `${area.toFixed(2)} m²`;
        } else if (item.type === 'fence') {
            const length = this.calculateLength(item);
            finalPrice = length * 42; 
            dims = `${length.toFixed(2)} m`;
        }
        totalBase += finalPrice;
        return [
            item.name || "Elemento", 
            item.productId.substring(0, 12).toUpperCase(),
            dims,
            finalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        ];
    });
    const iva = totalBase * 0.21;
    const total = totalBase + iva;

    autoTable(doc, {
        head: [['Concepto', 'Ref', 'Ud/Dim', 'Precio']],
        body: tableData,
        startY: 50,
        theme: 'striped',
        headStyles: { fillColor: [66, 135, 245] },
        foot: [
            ['', '', 'Base Imponible', totalBase.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
            ['', '', 'IVA 21%', iva.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
            ['', '', 'TOTAL', total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]
        ],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    this.addFooter(doc);

    // PÁGINAS DE DOCUMENTACIÓN
    for (const [key, item] of uniqueItemsMap) {
        doc.addPage();
        this.addHeader(doc, item.name || "Elemento", "Ficha Informativa");
        if (itemImages[key]) {
            this.addImageFit(doc, itemImages[key], 20, 40, 170, 100);
        }
        const textYStart = 150;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Ref: ${item.productId.toUpperCase()}`, 20, textYStart);
        
        let dimsText = "1 ud";
        if (item.type === 'floor') dimsText = `${this.calculateArea(item).toFixed(2)} m²`;
        if (item.type === 'fence') dimsText = `${this.calculateLength(item).toFixed(2)} m`;
        doc.text(`Medidas: ${dimsText}`, 20, textYStart + 10);
        
        doc.setFontSize(10);
        doc.text("Descripción:", 20, textYStart + 25);
        doc.setTextColor(100);
        doc.text("Elemento de alta calidad para parques infantiles. \nCumple con todas las normativas de seguridad vigentes (EN-1176).", 20, textYStart + 30);

        let currentLinkY = textYStart + 50;
        const addLink = (label: string, url?: string) => {
            if (!url) return;
            doc.setTextColor(0, 0, 255); 
            doc.setFont("helvetica", 'normal');
            doc.setFontSize(12);
            doc.text(`>> ${label}`, 20, currentLinkY);
            doc.link(20, currentLinkY - 5, 80, 8, { url: url });
            currentLinkY += 12;
        };

        if (item.url_tech) addLink("Ficha Técnica", item.url_tech);
        if (item.url_cert) addLink("Certificado", item.url_cert);
        if (item.url_inst) addLink("Ficha de Montaje", item.url_inst);
        this.addFooter(doc);
    }

    doc.save(`${projectName}.pdf`);
  }

  // --- LÓGICA DE VISIBILIDAD ---

  private cacheSceneVisibility() {
      this.visibilityCache.clear();
      this.engine.scene.traverse((obj) => {
          this.visibilityCache.set(obj.uuid, obj.visible);
      });
  }

  private restoreSceneVisibility() {
      this.engine.scene.traverse((obj) => {
          if (this.visibilityCache.has(obj.uuid)) {
              obj.visible = this.visibilityCache.get(obj.uuid)!;
          }
      });
  }

  // Lógica para Portada y Vistas Técnicas
  private isolateSceneForCover() {
      this.engine.scene.traverse((obj) => {
          // No tocar la visibilidad de la Scene raíz
          if (obj === this.engine.scene) return;

          const isLight = (obj as THREE.Light).isLight;
          const isItem = obj.userData?.isItem === true;
          
          let isChildOfItem = false;
          obj.traverseAncestors(p => { if (p.userData?.isItem) isChildOfItem = true; });

          // Mostramos: Luces, Items y sus hijos
          if (isLight || isItem || isChildOfItem) {
              obj.visible = true;
          } else {
              // Ocultamos mallas auxiliares, helpers, grids
              // PERO evitamos ocultar Groups contenedores si no estamos seguros
              if ((obj as THREE.Mesh).isMesh || (obj as THREE.Line).isLine || obj.type.includes("Helper")) {
                  obj.visible = false;
              }
          }
      });
  }

  // Lógica corregida: Aislamiento por sustracción segura
  private isolateSingleItemAggressive(targetUuid: string) {
      // 1. Recorrer todo y ocultar por defecto (EXCEPTO la Escena)
      this.engine.scene.traverse((obj) => {
          if (obj !== this.engine.scene) {
              obj.visible = false;
          }
      });

      // 2. Restaurar visibilidad de luces
      this.engine.scene.traverse((obj) => {
          if ((obj as THREE.Light).isLight) {
              obj.visible = true;
              // Importante: Sus padres deben ser visibles
              obj.traverseAncestors((parent) => {
                  if (parent !== this.engine.scene) parent.visible = true;
              });
          }
      });

      // 3. Restaurar visibilidad del Objeto Objetivo
      const target = this.engine.scene.getObjectByProperty('uuid', targetUuid);
      if (target) {
          // El objeto
          target.visible = true;
          
          // Sus hijos
          target.traverse((child) => child.visible = true);
          
          // Sus padres (Vital para que no se oculte la rama entera)
          target.traverseAncestors((parent) => {
              if (parent !== this.engine.scene) parent.visible = true;
          });
      }
  }

  // --- CÁMARA Y UTILIDADES ---

  private fitCameraToObject(uuid: string) {
      const obj = this.engine.scene.getObjectByProperty('uuid', uuid);
      if (!obj) return;

      const box = this.getVisibleBoundingBox(obj);
      if (box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      const camera = this.engine.activeCamera as THREE.PerspectiveCamera;
      const fov = camera.fov * (Math.PI / 180);
      
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.05;
      const aspect = this.engine.renderer.domElement.width / this.engine.renderer.domElement.height;
      const cameraZHorizontal = Math.abs((maxDim / aspect) / 2 / Math.tan(fov / 2)) * 1.05; 
      
      const finalDist = Math.max(cameraZ, cameraZHorizontal);
      const direction = new THREE.Vector3(1, 0.6, 1).normalize(); 
      const newPos = direction.multiplyScalar(finalDist).add(center);

      camera.position.copy(newPos);
      camera.lookAt(center);
      camera.updateMatrixWorld();
      
      this.engine.renderer.render(this.engine.scene, camera);
  }

  private fitCameraToScene(isOrthographic = false) {
      const box = new THREE.Box3();
      let hasObjects = false;

      this.engine.scene.traverse((obj) => {
          if (obj.visible && (obj as THREE.Mesh).isMesh) {
             const tempBox = new THREE.Box3().setFromObject(obj);
             if(!tempBox.isEmpty()) {
                 box.union(tempBox);
                 hasObjects = true;
             }
          }
      });

      if (!hasObjects) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      if (isOrthographic) {
          const camera = this.engine.activeCamera as THREE.OrthographicCamera;
          camera.zoom = 1;
          camera.updateProjectionMatrix();

          const frustumHeight = camera.top - camera.bottom;
          const frustumWidth = camera.right - camera.left;
          
          const zoomH = frustumHeight / (maxDim * 1.1);
          const zoomW = frustumWidth / (maxDim * 1.1);
          
          camera.zoom = Math.min(zoomH, zoomW);
          camera.updateProjectionMatrix();
          
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          camera.position.copy(center).sub(direction.multiplyScalar(200));
          camera.lookAt(center);

      } else {
          const camera = this.engine.activeCamera as THREE.PerspectiveCamera;
          const fov = camera.fov * (Math.PI / 180);
          const distV = Math.abs(size.y / 2 / Math.tan(fov / 2));
          const aspect = this.engine.renderer.domElement.width / this.engine.renderer.domElement.height;
          const distH = Math.abs((size.x / aspect) / 2 / Math.tan(fov / 2));
          
          const finalDist = Math.max(distV, distH) * 1.2; 
          const offset = camera.position.clone().sub(center).normalize().multiplyScalar(finalDist);
          
          if (offset.lengthSq() < 0.1) offset.set(0, 10, 10);
          
          camera.position.copy(center).add(offset);
          camera.lookAt(center);
      }
      this.engine.activeCamera.updateMatrixWorld();
      this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
  }

  private getVisibleBoundingBox(obj: THREE.Object3D): THREE.Box3 {
      const box = new THREE.Box3();
      obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.visible) {
              if (child.name.includes('Helper') || child.name.includes('Zone')) return;
              const mesh = child as THREE.Mesh;
              if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
              const childBox = new THREE.Box3().setFromObject(mesh);
              box.union(childBox);
          }
      });
      return box;
  }

  private addImageFit(doc: jsPDF, imgData: string, x: number, y: number, maxWidth: number, maxHeight: number) {
      const canvasAspect = this.engine.renderer.domElement.width / this.engine.renderer.domElement.height;
      const boxAspect = maxWidth / maxHeight;
      let drawWidth = maxWidth;
      let drawHeight = maxHeight;

      if (canvasAspect > boxAspect) {
          drawHeight = maxWidth / canvasAspect;
      } else {
          drawWidth = maxHeight * canvasAspect;
      }
      const xOffset = x + (maxWidth - drawWidth) / 2;
      const yOffset = y + (maxHeight - drawHeight) / 2;
      doc.addImage(imgData, 'PNG', xOffset, yOffset, drawWidth, drawHeight);
  }

  private calculateArea(item: SceneItem): number {
      if (item.type !== 'floor' || !item.points) return 0;
      let area = 0;
      const points = item.points;
      for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          area += points[i].x * points[j].z;
          area -= points[j].x * points[i].z;
      }
      return Math.abs(area) / 2;
  }

  private calculateLength(item: SceneItem): number {
      if (item.type !== 'fence' || !item.points) return 0;
      let length = 0;
      for (let i = 0; i < item.points.length - 1; i++) {
          const p1 = item.points[i];
          const p2 = item.points[i+1];
          const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
          length += dist;
      }
      return length;
  }

  private setShadows(enabled: boolean) {
      this.engine.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
              child.castShadow = enabled;
              child.receiveShadow = enabled;
          }
      });
      if (this.engine.sceneManager.dirLight) {
          this.engine.sceneManager.dirLight.castShadow = enabled;
      }
  }

  private positionCamera(view: 'top' | 'front' | 'side' | 'iso') {
      this.engine.setView(view);
  }

  private takeHighResShot(): string {
      this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
      return this.engine.renderer.domElement.toDataURL('image/png', 1.0);
  }

  private addHeader(doc: jsPDF, title: string, subtitle: string) {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(title, 20, 20);
      if (subtitle) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(subtitle, 190, 20, { align: 'right' });
      }
      doc.setDrawColor(200);
      doc.line(20, 25, 190, 25);
      doc.setTextColor(0);
  }

  private addFooter(doc: jsPDF) {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(150);
      const today = new Date().toLocaleDateString();
      doc.text(today, 20, pageHeight - 10);
      doc.setFontSize(14);
      doc.setTextColor(0, 50, 150);
      doc.setFont("helvetica", "bold");
      doc.text("Levipark", 190, pageHeight - 10, { align: 'right' });
  }
}
// --- END OF FILE src/features/editor/engine/managers/PDFManager.ts ---