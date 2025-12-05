// --- FILE: src/features/editor/engine/managers/PDFManager.ts ---
import * as THREE from "three";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { A42Engine } from "../A42Engine";

// 👇 Usamos el tipo SceneItem del STORE, no el de /types/editor
type StoreSceneItem = import("@/stores/scene/useSceneStore").SceneItem;

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useUserStore } from "@/stores/user/useUserStore";
import { PriceCalculator } from "@/utils/PriceCalculator";

// ======================================================================================
// 1) HELPER — SceneState (guardar y restaurar estado sin contaminar el motor)
// ======================================================================================
class PDFSceneState {
  private engine: A42Engine;

  private rendererSize = new THREE.Vector2();
  private pixelRatio = 1;
  private camPos = new THREE.Vector3();
  private camRot = new THREE.Euler();
  private controlsTarget = new THREE.Vector3();

  private bg: THREE.Color | THREE.Texture | null = null;
  private fog: THREE.Fog | THREE.FogExp2 | null = null;
  private skyVisible = false;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  save() {
    const r = this.engine.renderer;

    r.getSize(this.rendererSize);
    this.pixelRatio = r.getPixelRatio();

    this.camPos.copy(this.engine.activeCamera.position);
    this.camRot.copy(this.engine.activeCamera.rotation);
    this.controlsTarget.copy(this.engine.sceneManager.controls.target);

    this.bg = this.engine.scene.background;
    this.fog = this.engine.scene.fog as any;

    this.skyVisible = this.engine.sceneManager.sky?.visible ?? false;
  }

  restore() {
    const r = this.engine.renderer;

    r.setSize(this.rendererSize.x, this.rendererSize.y);
    r.setPixelRatio(this.pixelRatio);

    this.engine.switchCamera("perspective");
    this.engine.sceneManager.onWindowResize();

    this.engine.activeCamera.position.copy(this.camPos);
    this.engine.activeCamera.rotation.copy(this.camRot);
    this.engine.sceneManager.controls.target.copy(this.controlsTarget);

    this.engine.scene.background = this.bg;
    this.engine.scene.fog = this.fog as any;

    this.engine.sceneManager.controls.enabled = true;
    this.engine.sceneManager.controls.update();

    // 👇 A42Engine ahora expone setSky y setGrid
    this.engine.setSky(this.skyVisible);

    const shouldGrid = useEditorStore.getState().gridVisible;
    this.engine.setGrid(shouldGrid);

    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
  }
}

// ======================================================================================
// 2) HELPER — PDFRenderer (capturas limpias sin lógica repetida)
// ======================================================================================
class PDFRenderer {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  setRendererSize(w: number, h: number) {
    const cam = this.engine.activeCamera;

    this.engine.renderer.setSize(w, h);

    if (cam instanceof THREE.PerspectiveCamera) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  }

  capture(format: "image/jpeg" | "image/png" = "image/jpeg"): string {
    // 0.92 = calidad
    return this.engine.renderer.domElement.toDataURL(format, 0.92);
  }

  centerCameraOnBox(box: THREE.Box3, margin = 1.35) {
    const cam = this.engine.activeCamera as THREE.PerspectiveCamera;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = (cam.fov * Math.PI) / 180;
    let camZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * margin;

    const aspect = cam.aspect;
    if (aspect < 1) camZ = camZ / aspect;

    const dir = new THREE.Vector3(1, 0.6, 1).normalize();
    const newPos = dir.multiplyScalar(camZ).add(center);

    cam.position.copy(newPos);
    cam.lookAt(center);
  }

  centerCameraOnObject(obj: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) this.centerCameraOnBox(box, 1.4);
  }

  getSceneBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this.engine.scene.traverse((o) => {
      if (o.userData?.isItem && o.visible) box.expandByObject(o);
    });
    if (box.isEmpty()) {
      box.setFromCenterAndSize(
        new THREE.Vector3(),
        new THREE.Vector3(2, 2, 2)
      );
    }
    return box;
  }
}

// ======================================================================================
// 3) HELPER — PDFLayout (maquetación con jsPDF)
// ======================================================================================
class PDFLayout {
  private doc: jsPDF;

  constructor(doc: jsPDF) {
    this.doc = doc;
  }

  header(title: string, subtitle = "") {
    const w = this.doc.internal.pageSize.getWidth();

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(22);
    this.doc.setTextColor(40);
    this.doc.text(title, 20, 20);

    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(140);
      this.doc.text(subtitle, w - 20, 20, { align: "right" });
    }

    this.doc.setDrawColor(200);
    this.doc.line(20, 25, w - 20, 25);
  }

  footer() {
    const h = this.doc.internal.pageSize.getHeight();
    this.doc.setFontSize(9);
    this.doc.setTextColor(120);
    this.doc.text("Levipark21 · www.levipark21.es", 20, h - 10);
  }

  imageCentered(img: string, x: number, y: number, w: number, h: number) {
    const p = this.doc.getImageProperties(img);

    const ratioImg = p.width / p.height;
    const ratioBox = w / h;

    let drawW = w;
    let drawH = h;

    if (ratioImg > ratioBox) {
      drawH = w / ratioImg;
    } else {
      drawW = h * ratioImg;
    }

    const offX = x + (w - drawW) / 2;
    const offY = y + (h - drawH) / 2;

    this.doc.addImage(img, "JPEG", offX, offY, drawW, drawH);
  }
}

// ======================================================================================
// 4) MAIN — PDFManager (usa las 3 clases anteriores)
// ======================================================================================
export class PDFManager {
  private engine: A42Engine;
  private sceneState: PDFSceneState;
  private renderer: PDFRenderer;

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.sceneState = new PDFSceneState(engine);
    this.renderer = new PDFRenderer(engine);
  }

  // ======================================================
  // PUBLIC API
  // ======================================================
  public async generatePDF() {
    const project = await useEditorStore
      .getState()
      .requestInput("Nombre del Proyecto:", "Proyecto sin título");

    if (!project) return;

    const doc = new jsPDF();
    const layout = new PDFLayout(doc);

    const items = useSceneStore.getState().items; // StoreSceneItem[]
    const user = useUserStore.getState().user;

    this.sceneState.save();

    try {
      // 1) Preparar escena
      this.prepareScene();

      // 2) Portada
      const cover = this.captureCover();
      this.pageCover(doc, layout, project, cover);

      // 3) Vistas técnicas
      const views = this.captureTechnicalViews();
      this.pageTechnicalViews(doc, layout, views);

      // 4) Presupuesto
      if (user) this.pageBudget(doc, layout, items);

      // 5) Fichas de producto
      const unique = this.getUniqueItems(items);
      const fichas = this.captureItemImages(unique);
      this.pageItemSheets(doc, layout, unique, fichas);

      doc.save(`${project}_Levipark.pdf`);
    } finally {
      // Restauración garantizada
      this.sceneState.restore();
    }
  }

  // ======================================================
  // PREPARAR ESCENA
  // ======================================================
  private prepareScene() {
    const eng = this.engine;

    eng.sceneManager.controls.enabled = false;

    eng.scene.background = new THREE.Color(0xffffff);
    eng.scene.fog = null;

    eng.setGrid(false);
    eng.setSky(false);

    this.hideHelpers(true);
  }

  private hideHelpers(hide: boolean) {
    this.engine.scene.traverse((o) => {
      const isHelper =
        o instanceof THREE.GridHelper ||
        o.type.includes("Helper") ||
        o.userData?.isSafetyZone ||
        o.name === "ShadowPlane";

      if (isHelper) o.visible = !hide;
    });
  }

  // ======================================================
  // PORTADA
  // ======================================================
  private captureCover() {
    const eng = this.engine;

    this.renderer.setRendererSize(1600, 1200);
    eng.switchCamera("perspective");

    this.setAllObjectsVisibility(true);
    this.renderer.centerCameraOnBox(this.renderer.getSceneBox());

    eng.renderer.render(eng.scene, eng.activeCamera);
    return this.renderer.capture("image/jpeg");
  }

  private pageCover(
    doc: jsPDF,
    layout: PDFLayout,
    project: string,
    img: string
  ) {
    layout.header(project, "Dossier del Proyecto");
    layout.imageCentered(img, 15, 40, 180, 120);
    layout.footer();
  }

  // ======================================================
  // VISTAS TÉCNICAS
  // ======================================================
  private captureTechnicalViews() {
    const eng = this.engine;
    eng.switchCamera("orthographic");

    const cam = eng.sceneManager.orthoCamera;
    const box = this.renderer.getSceneBox();
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    cam.left = -maxDim;
    cam.right = maxDim;
    cam.top = maxDim;
    cam.bottom = -maxDim;
    cam.updateProjectionMatrix();

    const views: Record<string, string> = {};
    const cfg = [
      { name: "front", pos: [0, 0, maxDim * 3], up: [0, 1, 0] },
      { name: "side", pos: [maxDim * 3, 0, 0], up: [0, 1, 0] },
      { name: "top", pos: [0, maxDim * 3, 0], up: [0, 0, -1] },
      {
        name: "iso",
        pos: [maxDim * 2.5, maxDim * 1.6, maxDim * 2.5],
        up: [0, 1, 0],
      },
    ];

    this.renderer.setRendererSize(1200, 1200);

    for (const v of cfg) {
      cam.position.set(
        center.x + v.pos[0],
        center.y + v.pos[1],
        center.z + v.pos[2]
      );
      cam.up.set(v.up[0], v.up[1], v.up[2]);
      cam.lookAt(center);
      cam.updateProjectionMatrix();

      eng.renderer.render(eng.scene, cam);
      views[v.name] = this.renderer.capture("image/jpeg");
    }

    return views;
  }

  private pageTechnicalViews(
    doc: jsPDF,
    layout: PDFLayout,
    views: Record<string, string>
  ) {
    doc.addPage();
    layout.header("Vistas Técnicas");

    const w = doc.internal.pageSize.getWidth();
    const m = 15;
    const gw = (w - 3 * m) / 2;
    const gh = 80;
    const y1 = 45;
    const y2 = y1 + gh + 12;

    doc.setFontSize(10);

    doc.text("Frontal", m, y1 - 3);
    layout.imageCentered(views.front, m, y1, gw, gh);

    doc.text("Lateral", m + gw + m, y1 - 3);
    layout.imageCentered(views.side, m + gw + m, y1, gw, gh);

    doc.text("Superior", m, y2 - 3);
    layout.imageCentered(views.top, m, y2, gw, gh);

    doc.text("Isométrica", m + gw + m, y2 - 3);
    layout.imageCentered(views.iso, m + gw + m, y2, gw, gh);

    layout.footer();
  }

  // ======================================================
  // PRESUPUESTO
  // ======================================================
  private pageBudget(
    doc: jsPDF,
    layout: PDFLayout,
    items: StoreSceneItem[]
  ) {
    doc.addPage();
    layout.header("Estimación Presupuestaria");

    let total = 0;

    const rows = items.map((i) => {
      // 👇 PriceCalculator espera el tipo de /types/editor → casteamos
      const price = PriceCalculator.getItemPrice(i as any);
      total += price;
      return [
        i.name || "",
        i.productId,
        PriceCalculator.getItemDimensions(i as any),
        price.toLocaleString("es-ES", {
          style: "currency",
          currency: "EUR",
        }),
      ];
    });

    const iva = total * 0.21;

    autoTable(doc, {
      head: [["Elemento", "Ref", "Dim", "Precio"]],
      body: rows,
      startY: 40,
      headStyles: { fillColor: [30, 80, 160] },
      foot: [
        [
          "",
          "",
          "Base",
          total.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
        [
          "",
          "",
          "IVA 21%",
          iva.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
        [
          "",
          "",
          "TOTAL",
          (total + iva).toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
        ],
      ],
      footStyles: {
        fillColor: [240, 240, 240],
        fontStyle: "bold",
        textColor: 10,
      },
      columnStyles: { 3: { halign: "right" } },
    });

    layout.footer();
  }

  // ======================================================
  // FICHAS DE PRODUCTO
  // ======================================================
  private getUniqueItems(items: StoreSceneItem[]) {
    const map = new Map<string, StoreSceneItem>();

    items.forEach((item) => {
      const key =
        item.productId === "custom_upload" ? item.uuid : item.productId;
      if (!map.has(key)) map.set(key, item);
    });

    return map;
  }

  private captureItemImages(unique: Map<string, StoreSceneItem>) {
    const out: Record<string, string> = {};

    this.engine.switchCamera("perspective");
    this.renderer.setRendererSize(1024, 768);

    for (const [key, item] of unique) {
      this.setAllObjectsVisibility(false);
      this.setObjectVisibility(item.uuid, true);

      const obj = this.engine.scene.getObjectByProperty("uuid", item.uuid);
      if (obj) {
        this.renderer.centerCameraOnObject(obj);
        this.engine.renderer.render(
          this.engine.scene,
          this.engine.activeCamera
        );
        out[key] = this.renderer.capture("image/png");
      }
    }

    return out;
  }

  private pageItemSheets(
    doc: jsPDF,
    layout: PDFLayout,
    unique: Map<string, StoreSceneItem>,
    images: Record<string, string>
  ) {
    for (const [key, item] of unique) {
      doc.addPage();

      layout.header(
        item.name || "Ficha Técnica",
        item.productId.toUpperCase()
      );

      if (images[key]) {
        layout.imageCentered(images[key], 15, 40, 180, 110);
      }

      const y = 160;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Descripción:", 15, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);

      const anyItem = item as any;
      const desc =
        anyItem.data?.descripcion ||
        anyItem.data?.DESCRIPCION ||
        anyItem.description ||
        "Elemento certificado según normativa vigente.";

      const lines = doc.splitTextToSize(desc, 180);
      doc.text(lines, 15, y + 7);

      layout.footer();
    }
  }

  // ======================================================
  // VISIBILIDAD OBJETOS
  // ======================================================
  private setAllObjectsVisibility(v: boolean) {
    this.engine.scene.traverse((o) => {
      if (o.userData?.isItem) o.visible = v;
    });
  }

  private setObjectVisibility(uuid: string, v: boolean) {
    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return;
    obj.visible = v;
    obj.traverse((c) => (c.visible = v));
  }
}
// --- END FILE ---
