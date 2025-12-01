// --- START OF FILE src/features/editor/engine/managers/PDFManager.ts ---
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { A42Engine } from '../A42Engine';
import { useAppStore, type SceneItem } from '../../../../stores/useAppStore';
import { PriceCalculator } from './PriceCalculator'; 

export class PDFManager {
  private engine: A42Engine;
  
  // Variables de restauración
  private savedRendererSize = new THREE.Vector2();
  private savedPixelRatio = 1;
  private savedCameraPos = new THREE.Vector3();
  private savedCameraRot = new THREE.Euler();
  private savedControlsTarget = new THREE.Vector3();
  private savedBg: THREE.Color | THREE.Texture | null = null;
  private savedFog: THREE.FogBase | null = null;
  private wasSkyVisible = false;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  public async generatePDF() {
    const store = useAppStore.getState();
    const items = store.items;

    const projectName = await store.requestInput("Nombre del Proyecto:", "Levipark21");
    if (!projectName) return;

    const doc = new jsPDF();
    
    // 1. PREPARAR ESCENA
    this.saveSceneState();
    
    // Apagar todo para la foto
    this.engine.sceneManager.controls.enabled = false;
    this.engine.scene.background = new THREE.Color(0xffffff);
    this.engine.scene.fog = null;
    this.engine.setGridVisible(false);
    this.engine.setSkyVisible(false); 
    this.hideHelpers(true);

    // 2. FOTOS
    
    // -- PORTADA --
    this.resizeRendererInternal(1600, 1200);
    this.engine.switchCamera('perspective');
    this.setVisibilityForAllItems(true);
    this.fitCameraToScene(1.3);
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    const coverImg = this.takeShot('image/jpeg');

    // -- VISTAS TÉCNICAS --
    this.engine.switchCamera('orthographic');
    this.setShadows(false);
    this.resizeRendererInternal(1200, 1200);
    
    const sceneBox = this.getSceneBoundingBox();
    const center = sceneBox.getCenter(new THREE.Vector3());
    const size = sceneBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const orthoSize = maxDim * 0.7;
    const cam = this.engine.sceneManager.orthoCamera;
    cam.zoom = 1;
    cam.left = -orthoSize; cam.right = orthoSize;
    cam.top = orthoSize; cam.bottom = -orthoSize;
    cam.updateProjectionMatrix();

    const views: any = {};
    const viewConfig = [
        { name: 'front', pos: [0, 0, 100], up: [0, 1, 0] },
        { name: 'side',  pos: [100, 0, 0], up: [0, 1, 0] },
        { name: 'top',   pos: [0, 100, 0], up: [0, 0, -1] },
        { name: 'iso',   pos: [100, 60, 100], up: [0, 1, 0] }
    ];

    for (const v of viewConfig) {
        cam.position.set(center.x + v.pos[0], center.y + v.pos[1], center.z + v.pos[2]);
        cam.up.set(v.up[0], v.up[1], v.up[2]);
        cam.lookAt(center);
        cam.updateProjectionMatrix();
        this.engine.renderer.render(this.engine.scene, cam);
        views[v.name] = this.engine.renderer.domElement.toDataURL('image/jpeg', 0.9);
    }

    // -- ITEMS --
    const uniqueItemsMap = new Map<string, SceneItem>();
    items.forEach(item => {
        const key = item.productId === 'custom_upload' ? item.uuid : item.productId;
        if (!uniqueItemsMap.has(key)) uniqueItemsMap.set(key, item);
    });

    this.engine.switchCamera('perspective');
    this.setShadows(true);
    this.resizeRendererInternal(1024, 768);

    const itemImages: Record<string, { img: string, width: number, height: number }> = {};
    for (const [key, item] of uniqueItemsMap) {
        this.setVisibilityForAllItems(false);
        this.setVisibilityForItem(item.uuid, true);
        const obj = this.engine.scene.getObjectByProperty('uuid', item.uuid);
        if (obj) {
            this.fitCameraToSingleObject(obj);
            this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
            itemImages[key] = {
                img: this.engine.renderer.domElement.toDataURL('image/png'),
                width: 1024, height: 768
            };
        }
    }

    // 3. RESTAURAR
    this.restoreSceneState();

    // 4. GENERAR PDF
    this.generatePDFDocument(doc, projectName, coverImg, views, items, uniqueItemsMap, itemImages);
  }

  // --------------------------------------------------------------------------
  // GESTIÓN DE ESTADO
  // --------------------------------------------------------------------------

  private saveSceneState() {
      this.engine.renderer.getSize(this.savedRendererSize);
      this.savedPixelRatio = this.engine.renderer.getPixelRatio();
      this.savedCameraPos.copy(this.engine.activeCamera.position);
      this.savedCameraRot.copy(this.engine.activeCamera.rotation);
      this.savedControlsTarget.copy(this.engine.sceneManager.controls.target);
      this.savedBg = this.engine.scene.background;
      this.savedFog = this.engine.scene.fog;
      this.wasSkyVisible = this.engine.sceneManager.sky?.visible ?? false;
  }

  private restoreSceneState() {
      this.engine.renderer.setSize(this.savedRendererSize.x, this.savedRendererSize.y);
      this.engine.renderer.setPixelRatio(this.savedPixelRatio);
      this.engine.switchCamera('perspective');
      this.engine.sceneManager.onWindowResize(); 

      this.engine.activeCamera.position.copy(this.savedCameraPos);
      this.engine.activeCamera.rotation.copy(this.savedCameraRot);
      this.engine.sceneManager.controls.target.copy(this.savedControlsTarget);
      this.engine.sceneManager.controls.enabled = true;
      this.engine.sceneManager.controls.update();

      this.engine.scene.background = this.savedBg;
      this.engine.scene.fog = this.savedFog;
      this.engine.setSkyVisible(this.wasSkyVisible);
      this.setVisibilityForAllItems(true);
      this.hideHelpers(false);
      this.setShadows(true);

      const shouldGridBeVisible = useAppStore.getState().gridVisible;
      this.engine.setGridVisible(shouldGridBeVisible);
      this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
      setTimeout(() => { this.engine.setGridVisible(shouldGridBeVisible); }, 100);
  }

  private resizeRendererInternal(w: number, h: number) {
      this.engine.renderer.setSize(w, h);
      if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
          this.engine.activeCamera.aspect = w / h;
          this.engine.activeCamera.updateProjectionMatrix();
      }
  }

  private takeShot(format: string): string {
      return this.engine.renderer.domElement.toDataURL(format, 0.90);
  }

  // --------------------------------------------------------------------------
  // UTILS CÁMARA & OBJETOS
  // --------------------------------------------------------------------------
  private fitCameraToSingleObject(obj: THREE.Object3D) {
      const box = this.getObjectBoundingBox(obj);
      if (box.isEmpty()) return;
      this.positionCameraFromBox(box, 1.2); 
  }

  private fitCameraToScene(margin = 1.2) {
      const box = this.getSceneBoundingBox();
      if (box.isEmpty()) return;
      this.positionCameraFromBox(box, margin);
  }

  private positionCameraFromBox(box: THREE.Box3, margin: number) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
          const fov = this.engine.activeCamera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * margin;
          const aspect = this.engine.activeCamera.aspect;
          if (aspect < 1) cameraZ = cameraZ / aspect;
          const dir = new THREE.Vector3(1, 0.5, 1).normalize();
          const newPos = dir.multiplyScalar(cameraZ).add(center);
          this.engine.activeCamera.position.copy(newPos);
          this.engine.activeCamera.lookAt(center);
      }
  }

  private setVisibilityForAllItems(visible: boolean) {
      this.engine.scene.traverse((obj) => {
          if (obj.userData?.isItem) {
              obj.visible = visible;
              obj.traverse(c => { if(c !== obj) c.visible = visible }); 
          }
      });
  }

  private setVisibilityForItem(uuid: string, visible: boolean) {
      const obj = this.engine.scene.getObjectByProperty('uuid', uuid);
      if (obj) {
          obj.visible = visible;
          obj.traverse(child => child.visible = visible);
          let parent = obj.parent;
          while (parent && parent !== this.engine.scene) {
              parent.visible = true;
              parent = parent.parent;
          }
      }
  }

  private getObjectBoundingBox(obj: THREE.Object3D): THREE.Box3 {
      const box = new THREE.Box3();
      obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
             const mesh = child as THREE.Mesh;
             if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
             box.expandByObject(mesh);
          }
      });
      return box;
  }

  private getSceneBoundingBox(): THREE.Box3 {
      const box = new THREE.Box3();
      this.engine.scene.traverse((obj) => {
          if (obj.visible && obj.userData?.isItem) {
              box.expandByObject(obj);
          }
      });
      if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(5,5,5));
      return box;
  }

  private hideHelpers(hide: boolean) {
      this.engine.scene.traverse((obj) => {
          const isGrid = obj instanceof THREE.GridHelper;
          const isHelper = obj.type.includes('Helper') || obj.name.includes('Helper');
          const isZone = obj.userData?.isSafetyZone;
          const isShadowPlane = obj.name === 'ShadowPlane';
          if (isGrid || isHelper || isZone || isShadowPlane) {
              obj.visible = !hide;
          }
      });
  }

  private setShadows(enabled: boolean) {
      if (this.engine.sceneManager.dirLight) {
          this.engine.sceneManager.dirLight.castShadow = enabled;
      }
  }

  // ==========================================================================
  // MAQUETACIÓN PDF
  // ==========================================================================
  
  private generatePDFDocument(
      doc: jsPDF, 
      projectName: string, 
      coverImg: string, 
      views: any, 
      items: SceneItem[], 
      uniqueItemsMap: Map<string, SceneItem>,
      itemImages: Record<string, {img: string, width: number, height: number}>
    ) {
      
      const m = 15; 
      const w = doc.internal.pageSize.getWidth();
      
      // --- PORTADA ---
      this.addHeader(doc, projectName, "Dossier del Proyecto");
      if (coverImg) this.drawImageProp(doc, coverImg, m, 50, w - (2*m), 120);
      this.addFooter(doc);

      // --- VISTAS TÉCNICAS ---
      doc.addPage();
      this.addHeader(doc, "Vistas Técnicas", "");
      const gw = (w - (3*m)) / 2; 
      const gh = 80; 
      const yRow1 = 50;
      const yRow2 = yRow1 + gh + 15;
      
      doc.setFontSize(10);
      doc.text("Alzado (Frontal)", m, yRow1 - 2);
      if (views.front) this.drawImageProp(doc, views.front, m, yRow1, gw, gh);
      doc.text("Perfil (Lateral)", m + gw + m, yRow1 - 2);
      if (views.side) this.drawImageProp(doc, views.side, m + gw + m, yRow1, gw, gh);
      doc.text("Planta (Superior)", m, yRow2 - 2);
      if (views.top) this.drawImageProp(doc, views.top, m, yRow2, gw, gh);
      doc.text("Isométrica", m + gw + m, yRow2 - 2);
      if (views.iso) this.drawImageProp(doc, views.iso, m + gw + m, yRow2, gw, gh);
      this.addFooter(doc);

      // --- PRESUPUESTO ---
      doc.addPage();
      this.addHeader(doc, "Presupuesto", "");
      let total = 0;
      const tableData = items.map(item => {
        const price = PriceCalculator.getItemPrice(item);
        total += price;
        return [
            item.name || "Elemento",
            item.productId.substring(0, 15).toUpperCase(),
            PriceCalculator.getItemDimensions(item),
            price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        ];
      });
      const iva = total * 0.21;
      autoTable(doc, {
          head: [['Concepto', 'Ref', 'Ud/Dim', 'Precio']],
          body: tableData,
          startY: 40,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185] },
          foot: [
              ['', '', 'Base Imponible', total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
              ['', '', 'IVA 21%', iva.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
              ['', '', 'TOTAL', (total + iva).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]
          ],
          footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'right' },
          columnStyles: { 3: { halign: 'right' } }
      });
      this.addFooter(doc);

      // --- FICHAS ---
      for (const [key, item] of uniqueItemsMap) {
        doc.addPage();
        const anyItem = item as any;
        //const itemData = anyItem.data || {}; 

        this.addHeader(doc, item.name || "Ficha Técnica", item.productId.toUpperCase());
        
        if (itemImages[key]) {
            this.drawImageProp(doc, itemImages[key].img, m, 40, w - (2*m), 100);
        }
        
        const yStart = 150;
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text("Descripción:", m, yStart);
        doc.setFontSize(10); doc.setTextColor(80);

        const descRaw = this.findValueInItem(anyItem, ['DESCRIPCION', 'Descripcion', 'Description', 'description']);
        const finalDesc = descRaw ? descRaw : "Elemento certificado para uso público conforme a normativa vigente.";
        const splitDesc = doc.splitTextToSize(finalDesc, w - (2*m));
        doc.text(splitDesc, m, yStart + 7);
        
        // --- LOGICA DE LINKS DINAMICOS ---
        let linkY = yStart + 20 + (splitDesc.length * 5);
        doc.setFont("helvetica", "bold");
        
        // 1. FICHA TÉCNICA
        const urlTech = this.findValueInItem(anyItem, ['URL_TECH', 'url_tech', 'Url_Tech']);
        // renderLinkLine ahora devuelve la altura que ha ocupado (0 si no existe, 8 si existe)
        linkY += this.renderLinkLine(doc, "Ficha Técnica (PDF)", urlTech, m, linkY);

        // 2. CERTIFICADO
        const urlCert = this.findValueInItem(anyItem, ['URL_CERT', 'url_cert', 'Url_Cert']);
        linkY += this.renderLinkLine(doc, "Certificado de Conformidad", urlCert, m, linkY);

        // 3. MONTAJE
        const urlInst = this.findValueInItem(anyItem, ['URL_INST', 'url_inst', 'Url_Inst']);
        linkY += this.renderLinkLine(doc, "Instrucciones de Montaje", urlInst, m, linkY);
        
        this.addFooter(doc);
    }
    doc.save(`${projectName}_Levipark.pdf`);
  }

  // --- HELPER MEJORADO: Devuelve altura usada ---
  private renderLinkLine(doc: jsPDF, label: string, url: string | undefined, x: number, y: number): number {
      // Si no hay URL, o es muy corta, o es 'undefined' en texto -> NO PINTAMOS NADA
      if (!url || url.length < 5 || url.toLowerCase() === 'undefined') {
          return 0; // Altura ocupada = 0
      }

      doc.setTextColor(0, 102, 204); // Azul
      doc.text(`>> ${label}`, x, y);
      doc.link(x, y - 5, 100, 8, { url: url.trim() });
      
      return 8; // Altura ocupada = 8
  }

  private findValueInItem(item: any, keys: string[]): string | undefined {
      const data = item.data || {};
      for(const k of keys) {
          if (data[k]) return data[k];
          if (item[k]) return item[k];
      }
      return undefined;
  }

  private drawImageProp(doc: jsPDF, imgData: string, x: number, y: number, w: number, h: number) {
      const props = doc.getImageProperties(imgData);
      const ratioBox = w / h;
      const ratioImg = props.width / props.height;
      let newW = w; let newH = h;
      if (ratioImg > ratioBox) newH = w / ratioImg;
      else newW = h * ratioImg;
      const offsetX = x + (w - newW) / 2;
      const offsetY = y + (h - newH) / 2;
      doc.addImage(imgData, 'JPEG', offsetX, offsetY, newW, newH);
  }

  private addHeader(doc: jsPDF, title: string, subtitle: string) {
      doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(40);
      doc.text(title, 20, 20);
      if (subtitle) {
          doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(150);
          doc.text(subtitle, 190, 20, { align: 'right' });
      }
      doc.setDrawColor(200); doc.line(20, 25, 190, 25);
  }

  private addFooter(doc: jsPDF) {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, 20, h - 10);
      doc.text("Levipark 21 - www.levipark21.es", 190, h - 10, { align: 'right' });
  }
}