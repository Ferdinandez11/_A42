import * as THREE from "three";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { A42Engine } from "../A42Engine";
import type { SceneItem } from "@/types/editor";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useUserStore } from "@/stores/user/useUserStore";
import { PriceCalculator } from "@/utils/PriceCalculator";

/**
 * Manages PDF generation with technical views and budget
 */
export class PDFManager {
  private engine: A42Engine;

  // State restoration variables
  private savedRendererSize: THREE.Vector2 = new THREE.Vector2();
  private savedPixelRatio: number = 1;
  private savedCameraPos: THREE.Vector3 = new THREE.Vector3();
  private savedCameraRot: THREE.Euler = new THREE.Euler();
  private savedControlsTarget: THREE.Vector3 = new THREE.Vector3();
  private savedBg: THREE.Color | THREE.Texture | null = null;
  private savedFog: THREE.FogBase | null = null;
  private wasSkyVisible: boolean = false;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Generates a complete PDF with project views, budget, and technical sheets
   */
  public async generatePDF(): Promise<void> {
    const editor = useEditorStore.getState();
    const scene = useSceneStore.getState();
    const { user } = useUserStore.getState();

    const items = scene.items;

    const projectName = await editor.requestInput(
      "Nombre del Proyecto:",
      "Levipark21"
    );
    if (!projectName) return;

    const doc = new jsPDF();

    // Prepare scene
    this.saveSceneState();

    // Disable everything for clean renders
    this.engine.sceneManager.controls.enabled = false;
    this.engine.scene.background = new THREE.Color(0xffffff);
    this.engine.scene.fog = null;
    this.engine.setGridVisible(false);
    this.engine.setSkyVisible(false);
    this.hideHelpers(true);

    // Generate cover image
    this.resizeRendererInternal(1600, 1200);
    this.engine.switchCamera("perspective");
    this.setVisibilityForAllItems(true);
    this.fitCameraToScene(1.3);
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    const coverImg = this.takeShot("image/jpeg");

    // Generate technical views
    this.engine.switchCamera("orthographic");
    this.setShadows(false);
    this.resizeRendererInternal(1200, 1200);

    const sceneBox = this.getSceneBoundingBox();
    const center = sceneBox.getCenter(new THREE.Vector3());
    const size = sceneBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const orthoSize = maxDim * 0.7;
    const cam = this.engine.sceneManager.orthoCamera;
    cam.zoom = 1;
    cam.left = -orthoSize;
    cam.right = orthoSize;
    cam.top = orthoSize;
    cam.bottom = -orthoSize;
    cam.updateProjectionMatrix();

    const views: Record<string, string> = {};
    const viewConfig = [
      { name: "front", pos: [0, 0, 100], up: [0, 1, 0] },
      { name: "side", pos: [100, 0, 0], up: [0, 1, 0] },
      { name: "top", pos: [0, 100, 0], up: [0, 0, -1] },
      { name: "iso", pos: [100, 60, 100], up: [0, 1, 0] },
    ] as const;

    for (const view of viewConfig) {
      cam.position.set(
        center.x + view.pos[0],
        center.y + view.pos[1],
        center.z + view.pos[2]
      );
      cam.up.set(view.up[0], view.up[1], view.up[2]);
      cam.lookAt(center);
      cam.updateProjectionMatrix();
      this.engine.renderer.render(this.engine.scene, cam);
      views[view.name] = this.engine.renderer.domElement.toDataURL(
        "image/jpeg",
        0.9
      );
    }

    // Generate unique item images
    const uniqueItemsMap = new Map<string, SceneItem>();
    items.forEach((item: SceneItem) => {
      const key =
        item.productId === "custom_upload" ? item.uuid : item.productId;
      if (!uniqueItemsMap.has(key)) {
        uniqueItemsMap.set(key, item);
      }
    });

    this.engine.switchCamera("perspective");
    this.setShadows(true);
    this.resizeRendererInternal(1024, 768);

    const itemImages: Record<
      string,
      { img: string; width: number; height: number }
    > = {};

    for (const [key, item] of uniqueItemsMap) {
      this.setVisibilityForAllItems(false);
      this.setVisibilityForItem(item.uuid, true);
      const obj = this.engine.scene.getObjectByProperty("uuid", item.uuid);
      if (obj) {
        this.fitCameraToSingleObject(obj);
        this.engine.renderer.render(
          this.engine.scene,
          this.engine.activeCamera
        );
        itemImages[key] = {
          img: this.engine.renderer.domElement.toDataURL("image/png"),
          width: 1024,
          height: 768,
        };
      }
    }

    // Restore scene state
    this.restoreSceneState();

    // Generate PDF document
    this.generatePDFDocument(
      doc,
      projectName,
      coverImg,
      views,
      items,
      uniqueItemsMap,
      itemImages,
      user
    );
  }

  /**
   * Saves current scene state for restoration
   */
  private saveSceneState(): void {
    this.engine.renderer.getSize(this.savedRendererSize);
    this.savedPixelRatio = this.engine.renderer.getPixelRatio();
    this.savedCameraPos.copy(this.engine.activeCamera.position);
    this.savedCameraRot.copy(this.engine.activeCamera.rotation);
    this.savedControlsTarget.copy(this.engine.sceneManager.controls.target);
    this.savedBg = this.engine.scene.background;
    this.savedFog = this.engine.scene.fog;
    this.wasSkyVisible = this.engine.sceneManager.sky?.visible ?? false;
  }

  /**
   * Restores saved scene state
   */
  private restoreSceneState(): void {
    this.engine.renderer.setSize(
      this.savedRendererSize.x,
      this.savedRendererSize.y
    );
    this.engine.renderer.setPixelRatio(this.savedPixelRatio);
    this.engine.switchCamera("perspective");
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

    const shouldGridBeVisible = useEditorStore.getState().gridVisible;
    this.engine.setGridVisible(shouldGridBeVisible);
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    setTimeout(() => {
      this.engine.setGridVisible(shouldGridBeVisible);
    }, 100);
  }

  /**
   * Resizes renderer for PDF capture
   */
  private resizeRendererInternal(width: number, height: number): void {
    this.engine.renderer.setSize(width, height);
    if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
      this.engine.activeCamera.aspect = width / height;
      this.engine.activeCamera.updateProjectionMatrix();
    }
  }

  /**
   * Takes a screenshot of the current render
   */
  private takeShot(format: string): string {
    return this.engine.renderer.domElement.toDataURL(format, 0.9);
  }

  /**
   * Fits camera to a single object
   */
  private fitCameraToSingleObject(obj: THREE.Object3D): void {
    const box = this.getObjectBoundingBox(obj);
    if (box.isEmpty()) return;
    this.positionCameraFromBox(box, 1.2);
  }

  /**
   * Fits camera to entire scene
   */
  private fitCameraToScene(margin: number = 1.2): void {
    const box = this.getSceneBoundingBox();
    if (box.isEmpty()) return;
    this.positionCameraFromBox(box, margin);
  }

  /**
   * Positions camera based on bounding box
   */
  private positionCameraFromBox(box: THREE.Box3, margin: number): void {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
      const fov = (this.engine.activeCamera.fov * Math.PI) / 180;
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * margin;
      const aspect = this.engine.activeCamera.aspect;
      if (aspect < 1) cameraZ = cameraZ / aspect;

      const direction = new THREE.Vector3(1, 0.5, 1).normalize();
      const newPosition = direction.multiplyScalar(cameraZ).add(center);
      this.engine.activeCamera.position.copy(newPosition);
      this.engine.activeCamera.lookAt(center);
    }
  }

  /**
   * Sets visibility for all items
   */
  private setVisibilityForAllItems(visible: boolean): void {
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem) {
        obj.visible = visible;
        obj.traverse((child) => {
          if (child !== obj) child.visible = visible;
        });
      }
    });
  }

  /**
   * Sets visibility for a specific item by UUID
   */
  private setVisibilityForItem(uuid: string, visible: boolean): void {
    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      obj.visible = visible;
      obj.traverse((child) => (child.visible = visible));
      let parent = obj.parent;
      while (parent && parent !== this.engine.scene) {
        parent.visible = true;
        parent = parent.parent;
      }
    }
  }

  /**
   * Gets bounding box for a specific object
   */
  private getObjectBoundingBox(obj: THREE.Object3D): THREE.Box3 {
    const box = new THREE.Box3();
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        box.expandByObject(mesh);
      }
    });
    return box;
  }

  /**
   * Gets bounding box for entire scene
   */
  private getSceneBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this.engine.scene.traverse((obj) => {
      if (obj.visible && obj.userData?.isItem) {
        box.expandByObject(obj);
      }
    });
    if (box.isEmpty()) {
      box.setFromCenterAndSize(
        new THREE.Vector3(),
        new THREE.Vector3(5, 5, 5)
      );
    }
    return box;
  }

  /**
   * Hides or shows helper objects
   */
  private hideHelpers(hide: boolean): void {
    this.engine.scene.traverse((obj) => {
      const isGrid = obj instanceof THREE.GridHelper;
      const isHelper =
        obj.type.includes("Helper") || obj.name.includes("Helper");
      const isZone = obj.userData?.isSafetyZone;
      const isShadowPlane = obj.name === "ShadowPlane";

      if (isGrid || isHelper || isZone || isShadowPlane) {
        obj.visible = !hide;
      }
    });
  }

  /**
   * Enables or disables shadow casting
   */
  private setShadows(enabled: boolean): void {
    if (this.engine.sceneManager.dirLight) {
      this.engine.sceneManager.dirLight.castShadow = enabled;
    }
  }

  /**
   * Generates the complete PDF document with all sections
   */
  private generatePDFDocument(
    doc: jsPDF,
    projectName: string,
    coverImg: string,
    views: Record<string, string>,
    items: SceneItem[],
    uniqueItemsMap: Map<string, SceneItem>,
    itemImages: Record<string, { img: string; width: number; height: number }>,
    user: any
  ): void {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover page
    this.addHeader(doc, projectName, "Dossier del Proyecto");
    if (coverImg) {
      this.drawImageProp(doc, coverImg, margin, 50, pageWidth - 2 * margin, 120);
    }
    this.addFooter(doc);

    // Technical views page
    doc.addPage();
    this.addHeader(doc, "Vistas Técnicas", "");
    const gridWidth = (pageWidth - 3 * margin) / 2;
    const gridHeight = 80;
    const yRow1 = 50;
    const yRow2 = yRow1 + gridHeight + 15;

    doc.setFontSize(10);
    doc.text("Alzado (Frontal)", margin, yRow1 - 2);
    if (views.front) {
      this.drawImageProp(doc, views.front, margin, yRow1, gridWidth, gridHeight);
    }
    doc.text("Perfil (Lateral)", margin + gridWidth + margin, yRow1 - 2);
    if (views.side) {
      this.drawImageProp(doc, views.side, margin + gridWidth + margin, yRow1, gridWidth, gridHeight);
    }
    doc.text("Planta (Superior)", margin, yRow2 - 2);
    if (views.top) {
      this.drawImageProp(doc, views.top, margin, yRow2, gridWidth, gridHeight);
    }
    doc.text("Isométrica", margin + gridWidth + margin, yRow2 - 2);
    if (views.iso) {
      this.drawImageProp(doc, views.iso, margin + gridWidth + margin, yRow2, gridWidth, gridHeight);
    }
    this.addFooter(doc);

    // Budget page (only if user exists)
    if (user) {
      doc.addPage();
      this.addHeader(doc, "Estimación orientativa", "");
      let total = 0;
      const tableData = items.map((item) => {
        const price = PriceCalculator.getItemPrice(item);
        total += price;
        return [
          item.name || "Elemento",
          item.productId.substring(0, 15).toUpperCase(),
          PriceCalculator.getItemDimensions(item),
          price.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ];
      });
      const vat = total * 0.21;

      autoTable(doc, {
        head: [["Concepto", "Ref", "Ud/Dim", "Precio"]],
        body: tableData,
        startY: 40,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
        foot: [
          [
            "",
            "",
            "Base Imponible",
            total.toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            }),
          ],
          [
            "",
            "",
            "IVA 21%",
            vat.toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            }),
          ],
          [
            "",
            "",
            "TOTAL",
            (total + vat).toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            }),
          ],
        ],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
          halign: "right",
        },
        columnStyles: { 3: { halign: "right" } },
      });
      this.addFooter(doc);
    }

    // Technical sheets for each unique item
    for (const [key, item] of uniqueItemsMap) {
      doc.addPage();
      const anyItem = item as any;

      this.addHeader(
        doc,
        item.name || "Ficha Técnica",
        item.productId.toUpperCase()
      );

      if (itemImages[key]) {
        this.drawImageProp(
          doc,
          itemImages[key].img,
          margin,
          40,
          pageWidth - 2 * margin,
          100
        );
      }

      const yStart = 150;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Descripción:", margin, yStart);
      doc.setFontSize(10);
      doc.setTextColor(80);

      const descriptionRaw = this.findValueInItem(anyItem, [
        "DESCRIPCION",
        "Descripcion",
        "Description",
        "description",
      ]);
      const finalDescription = descriptionRaw
        ? descriptionRaw
        : "Elemento certificado para uso público conforme a normativa vigente.";
      const splitDescription = doc.splitTextToSize(
        finalDescription,
        pageWidth - 2 * margin
      );
      doc.text(splitDescription, margin, yStart + 7);

      // Dynamic links
      let linkY = yStart + 20 + splitDescription.length * 5;
      doc.setFont("helvetica", "bold");

      const urlTech = this.findValueInItem(anyItem, [
        "URL_TECH",
        "url_tech",
        "Url_Tech",
      ]);
      linkY += this.renderLinkLine(
        doc,
        "Ficha Técnica (PDF)",
        urlTech,
        margin,
        linkY
      );

      const urlCert = this.findValueInItem(anyItem, [
        "URL_CERT",
        "url_cert",
        "Url_Cert",
      ]);
      linkY += this.renderLinkLine(
        doc,
        "Certificado de Conformidad",
        urlCert,
        margin,
        linkY
      );

      const urlInst = this.findValueInItem(anyItem, [
        "URL_INST",
        "url_inst",
        "Url_Inst",
      ]);
      linkY += this.renderLinkLine(
        doc,
        "Instrucciones de Montaje",
        urlInst,
        margin,
        linkY
      );

      this.addFooter(doc);
    }

    doc.save(`${projectName}_Levipark.pdf`);
  }

  /**
   * Renders a link line in the PDF
   */
  private renderLinkLine(
    doc: jsPDF,
    label: string,
    url: string | undefined,
    x: number,
    y: number
  ): number {
    if (!url || url.length < 5 || url.toLowerCase() === "undefined") {
      return 0;
    }
    doc.setTextColor(0, 102, 204);
    doc.text(`>> ${label}`, x, y);
    doc.link(x, y - 5, 100, 8, { url: url.trim() });
    return 8;
  }

  /**
   * Finds a value in an item using multiple possible keys
   */
  private findValueInItem(item: any, keys: string[]): string | undefined {
    const data = item.data || {};
    for (const key of keys) {
      if (data[key]) return data[key];
      if (item[key]) return item[key];
    }
    return undefined;
  }

  /**
   * Draws an image proportionally within bounds
   */
  private drawImageProp(
    doc: jsPDF,
    imgData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const props = doc.getImageProperties(imgData);
    const ratioBox = width / height;
    const ratioImg = props.width / props.height;
    let newWidth = width;
    let newHeight = height;

    if (ratioImg > ratioBox) {
      newHeight = width / ratioImg;
    } else {
      newWidth = height * ratioImg;
    }

    const offsetX = x + (width - newWidth) / 2;
    const offsetY = y + (height - newHeight) / 2;
    doc.addImage(imgData, "JPEG", offsetX, offsetY, newWidth, newHeight);
  }

  /**
   * Adds a header to the PDF page
   */
  private addHeader(doc: jsPDF, title: string, subtitle: string): void {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text(title, 20, 20);
    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(subtitle, 190, 20, { align: "right" });
    }
    doc.setDrawColor(200);
    doc.line(20, 25, 190, 25);
  }

  /**
   * Adds a footer to the PDF page
   */
  private addFooter(doc: jsPDF): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generado: ${new Date().toLocaleDateString()}`,
      20,
      pageHeight - 10
    );
    doc.text("Levipark 21 - www.levipark21.es", 190, pageHeight - 10, {
      align: "right",
    });
  }
}