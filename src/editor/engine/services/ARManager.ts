// ============================================================================
// AR MANAGER
// Manages Augmented Reality (WebXR) functionality
// Extracted from A42Engine.ts (lines 216-307)
// ============================================================================

import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

export class ARManager {
  private engine: A42Engine;
  private savedBackground: THREE.Color | THREE.Texture | null = null;
  private wasSkyVisible: boolean = true;
  private transparentElements: HTMLElement[] = [];

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Initialize AR (Augmented Reality) support if available
   */
  public async initialize(): Promise<void> {
    if (!("xr" in navigator)) return;

    try {
      // @ts-ignore - XR types may not be available
      const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
      if (!isSupported) return;
    } catch {
      return;
    }

    const arBtn = ARButton.createButton(this.engine.renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    });

    // Setup session start event
    this.engine.renderer.xr.addEventListener("sessionstart", () => {
      this.onSessionStart();
    });

    // Setup session end event
    this.engine.renderer.xr.addEventListener("sessionend", () => {
      this.onSessionEnd();
    });

    // Style and append AR button
    this.styleAndAppendButton(arBtn);
  }

  /**
   * Handle AR session start
   */
  private onSessionStart(): void {
    this.savedBackground = this.engine.scene.background;
    this.wasSkyVisible = this.engine.sceneManager.sky
      ? this.engine.sceneManager.sky.visible
      : false;

    this.engine.scene.background = null;
    this.engine.setSkyVisible(false);
    this.engine.setGridVisible(false);
    this.engine.renderer.setClearColor(0x000000, 0);

    // Make elements transparent for AR
    this.makeElementsTransparent();
  }

  /**
   * Handle AR session end
   */
  private onSessionEnd(): void {
    const { gridVisible } = useEditorStore.getState();

    if (this.savedBackground) this.engine.scene.background = this.savedBackground;
    if (this.wasSkyVisible) this.engine.setSkyVisible(true);
    this.engine.setGridVisible(gridVisible);

    // Restore element styles
    this.restoreElementStyles();
  }

  /**
   * Make HTML elements transparent for AR overlay
   */
  private makeElementsTransparent(): void {
    this.transparentElements = [];
    let el: HTMLElement | null = document.body;
    while (el) {
      if (el.style) {
        this.transparentElements.push(el);
        el.style.setProperty("background-color", "transparent", "important");
      }
      el = el.parentElement;
    }
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty(
      "background",
      "transparent",
      "important"
    );
  }

  /**
   * Restore original element styles after AR session
   */
  private restoreElementStyles(): void {
    this.transparentElements.forEach((el) => {
      el.style.removeProperty("background");
      el.style.removeProperty("background-color");
    });
    document.body.style.removeProperty("background");
    document.documentElement.style.removeProperty("background");
  }

  /**
   * Style and append AR button to DOM
   */
  private styleAndAppendButton(arBtn: HTMLElement): void {
    const arContainer = document.createElement("div");
    arContainer.style.position = "absolute";
    arContainer.style.bottom = "20px";
    arContainer.style.right = "20px";
    arContainer.style.zIndex = "1000";
    arContainer.style.display = "flex";
    arContainer.style.justifyContent = "flex-end";
    arContainer.style.pointerEvents = "none";

    arBtn.style.position = "static";
    arBtn.style.transform = "none";
    arBtn.style.left = "auto";
    arBtn.style.bottom = "auto";
    arBtn.style.width = "160px";
    arBtn.style.background = "rgba(0,0,0,0.85)";
    arBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    arBtn.style.borderRadius = "30px";
    arBtn.style.color = "#fff";
    arBtn.style.fontFamily = "sans-serif";
    arBtn.style.fontSize = "12px";
    arBtn.style.fontWeight = "bold";
    arBtn.style.padding = "10px 0";
    arBtn.style.cursor = "pointer";
    arBtn.style.pointerEvents = "auto";

    arContainer.appendChild(arBtn);
    document.body.appendChild(arContainer);
  }
}