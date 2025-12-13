// ============================================================================
// TEST SETUP - Mock WebGL for A42Engine tests
// Three.js requires WebGL context which is not available in Node.js
// Uses vi.mock() with a proper constructor class for ESM compatibility
// ============================================================================

import { vi } from "vitest";

// Mock the entire three module
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  
  // Create a mock WebGLRenderer class (not a function)
  class MockWebGLRenderer {
    public domElement: HTMLCanvasElement;
    public setSize = vi.fn();
    public setPixelRatio = vi.fn();
    public setClearColor = vi.fn();
    public render = vi.fn();
    public setAnimationLoop = vi.fn();
    public dispose = vi.fn();
    public xr = {
      enabled: false,
      addEventListener: vi.fn(),
    };
    public shadowMap = {
      enabled: false,
      type: actual.PCFSoftShadowMap,
    };
    public toneMapping = actual.ACESFilmicToneMapping;
    public toneMappingExposure = 1;
    public outputColorSpace = actual.SRGBColorSpace;

    constructor(_options?: any) {
      this.domElement = typeof document !== "undefined" 
        ? document.createElement("canvas") 
        : {} as HTMLCanvasElement;
    }
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});