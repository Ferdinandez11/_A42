import * as THREE from "three";
import { jsPDF } from "jspdf";

import type { A42Engine } from "@/editor/engine/A42Engine";
import type { SceneItem } from "@/domain/types/editor";

import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useUserStore } from "@/core/stores/user/useUserStore";

import { PDFSceneController } from "@/pdf/engine/managers/PDFSceneController";
import { PDFRenderer } from "@/pdf/engine/managers/PDFRenderer";
import { PDFDocumentBuilder } from "@/pdf/engine/managers/PDFDocumentBuilder";

/**
 * PDFManager - Refactored (Sprint 5.5)
 * Coordinates PDF generation workflow
 * Now 200 lines (was 664 lines)
 */
export class PDFManager {
  private engine: A42Engine;
  private sceneController: PDFSceneController;
  private renderer: PDFRenderer;
  private documentBuilder: PDFDocumentBuilder;

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.sceneController = new PDFSceneController(engine);
    this.renderer = new PDFRenderer(engine);
    this.documentBuilder = new PDFDocumentBuilder();
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

    // Save and prepare scene
    this.sceneController.saveState();
    this.sceneController.prepareForPDF();

    // Generate cover image
    const coverImg = this.generateCoverImage();

    // Generate technical views
    const views = this.generateTechnicalViews();

    // Generate unique item images
    const { uniqueItemsMap, itemImages } = this.generateItemImages(items);

    // Restore scene state
    this.sceneController.restoreState();

    // Generate PDF document
    this.documentBuilder.generateDocument(
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
   * Generates cover image for PDF
   */
  private generateCoverImage(): string {
    this.renderer.resizeRenderer(1600, 1200);
    this.engine.switchCamera("perspective");
    this.sceneController.setVisibilityForAllItems(true);
    this.renderer.fitCameraToScene(1.3, this.sceneController);
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    return this.renderer.takeScreenshot("image/jpeg");
  }

  /**
   * Generates technical orthographic views
   */
  private generateTechnicalViews(): Record<string, string> {
    this.engine.switchCamera("orthographic");
    this.sceneController.setShadows(false);
    this.renderer.resizeRenderer(1200, 1200);

    const sceneBox = this.sceneController.getSceneBoundingBox();
    const center = sceneBox.getCenter(new THREE.Vector3());
    
    this.renderer.setupOrthographicViews(sceneBox);

    const views: Record<string, string> = {};
    const viewConfig: Array<{ name: string; pos: number[]; up: number[] }> = [
      { name: "front", pos: [0, 0, 100], up: [0, 1, 0] },
      { name: "side", pos: [100, 0, 0], up: [0, 1, 0] },
      { name: "top", pos: [0, 100, 0], up: [0, 0, -1] },
      { name: "iso", pos: [100, 60, 100], up: [0, 1, 0] },
    ];

    for (const view of viewConfig) {
      views[view.name] = this.renderer.captureView(center, view.pos, view.up);
    }

    return views;
  }

  /**
   * Generates images for each unique item
   */
  private generateItemImages(items: SceneItem[]): {
    uniqueItemsMap: Map<string, SceneItem>;
    itemImages: Record<string, { img: string; width: number; height: number }>;
  } {
    // Build unique items map
    const uniqueItemsMap = new Map<string, SceneItem>();
    items.forEach((item: SceneItem) => {
      const key =
        item.productId === "custom_upload" ? item.uuid : item.productId;
      if (!uniqueItemsMap.has(key)) {
        uniqueItemsMap.set(key, item);
      }
    });

    // Switch to perspective for item renders
    this.engine.switchCamera("perspective");
    this.sceneController.setShadows(true);
    this.renderer.resizeRenderer(1024, 768);

    const itemImages: Record<
      string,
      { img: string; width: number; height: number }
    > = {};

    // Render each unique item
    for (const [key, item] of uniqueItemsMap) {
      this.sceneController.setVisibilityForAllItems(false);
      this.sceneController.setVisibilityForItem(item.uuid, true);
      
      const obj = this.engine.scene.getObjectByProperty("uuid", item.uuid);
      if (obj) {
        this.renderer.fitCameraToSingleObject(obj, this.sceneController);
        this.engine.renderer.render(
          this.engine.scene,
          this.engine.activeCamera
        );
        itemImages[key] = {
          img: this.renderer.takeScreenshot("image/png"),
          width: 1024,
          height: 768,
        };
      }
    }

    return { uniqueItemsMap, itemImages };
  }
}