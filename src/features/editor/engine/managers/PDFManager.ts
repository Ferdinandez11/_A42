// --- START OF FILE src/features/editor/engine/managers/PDFManager.ts ---
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { A42Engine } from '../A42Engine';
import { useAppStore, type SceneItem } from '../../../../stores/useAppStore';
import { PriceCalculator } from './PriceCalculator'; 

export class PDFManager {
  private engine: A42Engine;
  
  // Variables para restauración de estado
  private savedRendererSize = new THREE.Vector2();
  private savedPixelRatio = 1;
  private savedCameraPos = new THREE.Vector3();
  private savedCameraRot = new THREE.Euler();
  private savedControlsTarget = new THREE.Vector3();
  private savedBg: THREE.Color | THREE.Texture | null = null;
  // CORRECCIÓN TIPO NIEBLA
  private savedFog: THREE.FogBase | null = null;
  //private wasGridVisible = false;
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
    
    // =========================================================
    // 1. PREPARACIÓN ("EL ESTUDIO FOTOGRÁFICO")
    // =========================================================
    this.saveSceneState();
    
    // Configurar escena limpia
    this.engine.sceneManager.controls.enabled = false;
    this.engine.scene.background = new THREE.Color(0xffffff); // Fondo blanco puro
    this.engine.scene.fog = null; // Sin niebla
    this.engine.setGridVisible(false);
    this.engine.setSkyVisible(false); 
    this.hideHelpers(true); // Ocultar gizmos, zonas de seguridad, plano de sombras

    // =========================================================
    // 2. FOTOGRAFÍA: PORTADA (VISTA GENERAL)
    // =========================================================
    // Forzamos resolución 4:3 de alta calidad (1600x1200)
    this.resizeRendererInternal(1600, 1200);
    
    // Cámara en perspectiva para la portada
    this.engine.switchCamera('perspective');
    this.setVisibilityForAllItems(true); // Asegurar que todo se ve
    this.fitCameraToScene(1.3); // Encuadre con margen (1.3)
    
    const coverImg = this.takeShot('image/jpeg');

    // =========================================================
    // 3. FOTOGRAFÍA: VISTAS TÉCNICAS
    // =========================================================
    this.engine.switchCamera('orthographic');
    this.setShadows(false); // Vistas técnicas sin sombras
    this.resizeRendererInternal(1000, 1000); // Cuadrado perfecto 1:1
    
    // Calculamos el encuadre una vez para mantener escala consistente
    const sceneBox = this.getSceneBoundingBox();
    const center = sceneBox.getCenter(new THREE.Vector3());
    const size = sceneBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const orthoSize = maxDim * 0.7; // Ajuste de zoom ortográfico

    const views: any = {};
    // Definimos las 4 vistas canónicas
    const viewConfig = [
        { name: 'front', pos: [0, 0, 100], up: [0, 1, 0] },
        { name: 'side',  pos: [100, 0, 0], up: [0, 1, 0] },
        { name: 'top',   pos: [0, 100, 0], up: [0, 0, -1] }, // Norte arriba
        { name: 'iso',   pos: [100, 60, 100], up: [0, 1, 0] }
    ];

    const cam = this.engine.sceneManager.orthoCamera;
    
    // Aplicar configuración de cámara ortográfica manual para evitar distorsión
    cam.left = -orthoSize;
    cam.right = orthoSize;
    cam.top = orthoSize;
    cam.bottom = -orthoSize;
    cam.updateProjectionMatrix();

    for (const v of viewConfig) {
        cam.position.set(center.x + v.pos[0], center.y + v.pos[1], center.z + v.pos[2]);
        cam.up.set(v.up[0], v.up[1], v.up[2]);
        cam.lookAt(center);
        this.engine.renderer.render(this.engine.scene, cam);
        views[v.name] = this.engine.renderer.domElement.toDataURL('image/jpeg', 0.9);
    }

    // =========================================================
    // 4. FOTOGRAFÍA: PRODUCTOS INDIVIDUALES
    // =========================================================
    // Agrupar items únicos
    const uniqueItemsMap = new Map<string, SceneItem>();
    items.forEach(item => {
        const key = item.productId === 'custom_upload' ? item.uuid : item.productId;
        if (!uniqueItemsMap.has(key)) uniqueItemsMap.set(key, item);
    });

    this.engine.switchCamera('perspective');
    this.setShadows(true);
    this.resizeRendererInternal(1200, 900); // 4:3 para fichas

    const itemImages: Record<string, string> = {};

    for (const [key, item] of uniqueItemsMap) {
        // Técnica de Aislamiento: Ocultar todo menos el objetivo
        this.setVisibilityForAllItems(false);
        this.setVisibilityForItem(item.uuid, true);
        
        const obj = this.engine.scene.getObjectByProperty('uuid', item.uuid);
        if (obj) {
            this.fitCameraToSingleObject(obj);
            itemImages[key] = this.takeShot('image/png'); // PNG para fondo transparente si fuera necesario
        }
    }

    // =========================================================
    // 5. RESTAURACIÓN (CRÍTICO: EVITAR PANTALLA NEGRA)
    // =========================================================
    this.restoreSceneState();
    // Forzamos un render final para que el usuario no vea negro
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);

    // =========================================================
    // 6. GENERACIÓN DEL DOCUMENTO PDF
    // =========================================================
    this.generatePDFDocument(doc, projectName, coverImg, views, items, uniqueItemsMap, itemImages);
  }

  // --------------------------------------------------------------------------
  // GESTIÓN DE ESTADO Y RENDERER
  // --------------------------------------------------------------------------

  private saveSceneState() {
      this.engine.renderer.getSize(this.savedRendererSize);
      this.savedPixelRatio = this.engine.renderer.getPixelRatio();
      
      this.savedCameraPos.copy(this.engine.activeCamera.position);
      this.savedCameraRot.copy(this.engine.activeCamera.rotation);
      this.savedControlsTarget.copy(this.engine.sceneManager.controls.target);
      
      this.savedBg = this.engine.scene.background;
      this.savedFog = this.engine.scene.fog;
      
      // Comprobar visibilidad real
      //this.wasGridVisible = this.engine.sceneManager.gridHelper?.visible || false;
      this.wasSkyVisible = this.engine.sceneManager.sky?.visible || false;
  }

  private restoreSceneState() {
      // 1. Restaurar tamaño renderer al de la ventana
      this.engine.renderer.setSize(this.savedRendererSize.x, this.savedRendererSize.y);
      this.engine.renderer.setPixelRatio(this.savedPixelRatio);

      // 2. Restaurar Cámara (Aspect Ratio Correcto)
      if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
          this.engine.switchCamera('perspective');
          this.engine.activeCamera.aspect = this.savedRendererSize.x / this.savedRendererSize.y;
          this.engine.activeCamera.updateProjectionMatrix();
      } else {
          // Si estaba en ortográfica, restauramos sus planos
          this.engine.switchCamera('orthographic');
          this.engine.sceneManager.onWindowResize(); // Esto recalcula left/right/top/bottom
      }

      this.engine.activeCamera.position.copy(this.savedCameraPos);
      this.engine.activeCamera.rotation.copy(this.savedCameraRot);
      this.engine.sceneManager.controls.target.copy(this.savedControlsTarget);
      this.engine.sceneManager.controls.enabled = true;
      this.engine.sceneManager.controls.update();

      // 3. Restaurar Entorno
      this.engine.scene.background = this.savedBg;
      this.engine.scene.fog = this.savedFog;
      
      // CORRECCIÓN GRID: Forzar desactivado
      this.engine.setGridVisible(false); 
      
      this.engine.setSkyVisible(this.wasSkyVisible);
      
      // 4. Restaurar Objetos
      this.setVisibilityForAllItems(true);
      this.hideHelpers(false);
      this.setShadows(true);
  }

  private resizeRendererInternal(w: number, h: number) {
      this.engine.renderer.setSize(w, h);
      if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
          this.engine.activeCamera.aspect = w / h;
          this.engine.activeCamera.updateProjectionMatrix();
      }
  }

  private takeShot(format: string): string {
      this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
      return this.engine.renderer.domElement.toDataURL(format, 0.95);
  }

  // --------------------------------------------------------------------------
  // LÓGICA DE CÁMARA (MATH)
  // --------------------------------------------------------------------------

  private fitCameraToSingleObject(obj: THREE.Object3D) {
      const box = this.getObjectBoundingBox(obj);
      if (box.isEmpty()) return;
      this.positionCameraFromBox(box, 1.1); // 1.1 = Margen apretado (Tight fit)
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
          
          // Ajuste por aspect ratio
          const aspect = this.engine.activeCamera.aspect;
          if (aspect < 1) cameraZ = cameraZ / aspect;

          const dir = new THREE.Vector3(1, 0.6, 1).normalize();
          const newPos = dir.multiplyScalar(cameraZ).add(center);
          
          this.engine.activeCamera.position.copy(newPos);
          this.engine.activeCamera.lookAt(center);
      }
  }

  // --------------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------------

  private setVisibilityForAllItems(visible: boolean) {
      this.engine.scene.traverse((obj) => {
          if (obj.userData?.isItem) {
              obj.visible = visible;
              // Asegurar visibilidad de hijos también
              obj.traverse(child => child.visible = visible);
          }
      });
  }

  private setVisibilityForItem(uuid: string, visible: boolean) {
      const obj = this.engine.scene.getObjectByProperty('uuid', uuid);
      if (obj) {
          obj.visible = visible;
          obj.traverse(child => child.visible = visible);
          
          // Asegurar que los padres son visibles (por si acaso)
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
  
  private generatePDFDocument(doc: jsPDF, projectName: string, coverImg: string, views: any, items: SceneItem[], uniqueItemsMap: Map<string, SceneItem>, itemImages: Record<string, string>) {
      
      const m = 15; 
      const w = doc.internal.pageSize.getWidth();
      // const h = doc.internal.pageSize.getHeight();
      
      // PÁGINA 1: PORTADA
      this.addHeader(doc, projectName, "Dossier del Proyecto");
      if (coverImg) {
          // Centrar imagen
          const imgH = 120;
          doc.addImage(coverImg, 'JPEG', m, 50, w - (2*m), imgH);
      }
      this.addFooter(doc);

      // PÁGINA 2: VISTAS TÉCNICAS
      doc.addPage();
      this.addHeader(doc, "Vistas Técnicas", "");
      
      const gw = (w - (3*m)) / 2; 
      const gh = 70; 
      
      doc.setFontSize(10);
      
      // Alzado y Perfil
      doc.text("Alzado", m, 45);
      if (views.front) doc.addImage(views.front, 'JPEG', m, 50, gw, gh);
      
      doc.text("Perfil", m + gw + m, 45);
      if (views.side) doc.addImage(views.side, 'JPEG', m + gw + m, 50, gw, gh);
      
      // Planta e Isométrica
      const yRow2 = 50 + gh + 20;
      doc.text("Planta", m, yRow2 - 5);
      if (views.top) doc.addImage(views.top, 'JPEG', m, yRow2, gw, gh);

      doc.text("Isométrica", m + gw + m, yRow2 - 5);
      if (views.iso) doc.addImage(views.iso, 'JPEG', m + gw + m, yRow2, gw, gh);

      this.addFooter(doc);

      // PÁGINA 3: PRESUPUESTO
      doc.addPage();
      this.addHeader(doc, "Presupuesto", "");

      // Usamos el PriceCalculator para obtener datos reales
      let total = 0;
      const tableData = items.map(item => {
        const price = PriceCalculator.getItemPrice(item);
        const dims = PriceCalculator.getItemDimensions(item);
        total += price;

        return [
            item.name || "Elemento",
            item.productId.substring(0, 12).toUpperCase(),
            dims,
            price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        ];
      });
      
      const iva = total * 0.21;
      
      autoTable(doc, {
          head: [['Concepto', 'Ref', 'Ud/Dim', 'Precio']],
          body: tableData,
          startY: 40,
          theme: 'striped',
          headStyles: { fillColor: [74, 144, 226] },
          foot: [
              ['', '', 'Base Imponible', total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
              ['', '', 'IVA 21%', iva.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
              ['', '', 'TOTAL', (total + iva).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]
          ],
          footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
      });
      this.addFooter(doc);

      // PÁGINAS DE FICHAS (DOCUMENTACIÓN CON DATOS DINÁMICOS)
      for (const [key, item] of uniqueItemsMap) {
        doc.addPage();
        // Casting a any para poder acceder a propiedades dinámicas del CSV
        const anyItem = item as any;
        const itemData = anyItem.data || {}; // Por si los datos del CSV están anidados en .data

        this.addHeader(doc, item.name || "Ficha Técnica", item.productId.toUpperCase());
        
        if (itemImages[key]) {
            const imgH = 100;
            const imgW = imgH * (4/3); 
            const xPos = (w - imgW) / 2;
            doc.addImage(itemImages[key], 'PNG', xPos, 40, imgW, imgH);
        }
        
        const yStart = 150;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Descripción:", m, yStart);
        
        doc.setFontSize(10);
        doc.setTextColor(80);

        // 1. LÓGICA DE DESCRIPCIÓN
        // Buscamos la descripción en el CSV (varias mayúsculas/minúsculas posibles)
        const csvDescription = 
            anyItem.description || 
            itemData.description || 
            itemData.DESCRIPCION || 
            itemData.Description;
            
        const defaultDesc = "Elemento de alta calidad para parques infantiles. Cumple normativa EN-1176.";
        const finalDesc = csvDescription ? csvDescription : defaultDesc;

        // Usamos splitTextToSize para que el texto no se salga de la hoja si es muy largo
        const splitDesc = doc.splitTextToSize(finalDesc, w - (2*m));
        doc.text(splitDesc, m, yStart + 7);
        
        // Calculamos la posición Y para los enlaces basándonos en lo que ocupó la descripción
        let linkY = yStart + 20 + (splitDesc.length * 5);
        
        // Función auxiliar para crear enlaces
        const addLink = (label: string, url?: string) => {
            if(!url || url === '#' || url.length < 5) return;
            
            doc.setTextColor(0, 0, 255); // Azul
            doc.setFont("helvetica", "normal");
            
            doc.text(`>> ${label}`, m, linkY);
            // Crear área clicable
            doc.link(m, linkY - 5, 80, 8, { url: url });
            
            linkY += 10;
        };
        
        // 2. LÓGICA DE ENLACES (Prioridad CSV)
        // Buscamos las URLs en el CSV usando los nombres de cabecera típicos (URL_TECH, etc.)
        
        // Ficha Técnica
        const techUrl = anyItem.url_tech || itemData.URL_TECH || itemData.url_tech;
        if (techUrl) addLink("Ficha Técnica", techUrl);

        // Certificado
        const certUrl = anyItem.url_cert || itemData.URL_CERT || itemData.url_cert;
        if (certUrl) addLink("Certificado", certUrl);

        // Ficha de Montaje
        const instUrl = anyItem.url_inst || itemData.URL_INST || itemData.url_inst;
        if (instUrl) addLink("Ficha de Montaje", instUrl);
        
        this.addFooter(doc);
    }

    doc.save(`${projectName}.pdf`);
  }

  private addHeader(doc: jsPDF, title: string, subtitle: string) {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text(title, 20, 20);
      
      if (subtitle) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(subtitle, 190, 20, { align: 'right' });
      }
      doc.setDrawColor(200);
      doc.line(20, 25, 190, 25);
  }

  private addFooter(doc: jsPDF) {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(new Date().toLocaleDateString(), 20, h - 10);
      doc.text("Levipark", 190, h - 10, { align: 'right' });
  }
}
// --- END OF FILE src/features/editor/engine/managers/PDFManager.ts ---