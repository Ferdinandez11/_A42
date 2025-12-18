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
  private transparentElements: Array<{
    el: HTMLElement;
    background: string;
    backgroundColor: string;
  }> = [];
  private savedAutoClear: boolean | null = null;

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
    // Critical for AR: ensure transparent clear and avoid opaque DOM backgrounds
    this.savedAutoClear = this.engine.renderer.autoClear;
    this.engine.renderer.setClearColor(0x000000, 0);
    this.engine.renderer.setClearAlpha(0);
    this.engine.renderer.autoClear = false;
    this.engine.renderer.domElement.style.setProperty(
      "background",
      "transparent",
      "important"
    );

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
    if (this.savedAutoClear !== null) {
      this.engine.renderer.autoClear = this.savedAutoClear;
      this.savedAutoClear = null;
    }
    this.engine.renderer.domElement.style.removeProperty("background");

    // Restore element styles
    this.restoreElementStyles();
  }

  /**
   * Make HTML elements transparent for AR overlay
   */
  private makeElementsTransparent(): void {
    this.transparentElements = [];

    // 1) Ensure page base is transparent (dom-overlay)
    document.body.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty(
      "background-color",
      "transparent",
      "important"
    );
    document.documentElement.style.setProperty(
      "background",
      "transparent",
      "important"
    );
    document.documentElement.style.setProperty(
      "background-color",
      "transparent",
      "important"
    );

    // 2) Walk up from the WebGL canvas and force ancestors transparent.
    // This fixes cases where the React container has an opaque Tailwind bg-* class.
    let el: HTMLElement | null = this.engine.renderer.domElement.parentElement;
    while (el && el !== document.body) {
      this.transparentElements.push({
        el,
        background: el.style.background || "",
        backgroundColor: el.style.backgroundColor || "",
      });
      el.style.setProperty("background", "transparent", "important");
      el.style.setProperty("background-color", "transparent", "important");
      el = el.parentElement;
    }
  }

  /**
   * Restore original element styles after AR session
   */
  private restoreElementStyles(): void {
    this.transparentElements.forEach(({ el, background, backgroundColor }) => {
      el.style.setProperty("background", background);
      el.style.setProperty("background-color", backgroundColor);
      if (!background) el.style.removeProperty("background");
      if (!backgroundColor) el.style.removeProperty("background-color");
    });
    this.transparentElements = [];

    document.body.style.removeProperty("background");
    document.body.style.removeProperty("background-color");
    document.documentElement.style.removeProperty("background");
    document.documentElement.style.removeProperty("background-color");
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