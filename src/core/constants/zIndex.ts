/**
 * Z-Index constants for consistent layering
 * Higher values appear on top
 */
export const Z_INDEX = {
  /** Base layer */
  BASE: 0,
  
  /** Canvas and 3D scene */
  CANVAS: 0,
  
  /** UI elements */
  UI: 10,
  
  /** Buttons and controls */
  BUTTON: 20,
  
  /** Panels and sidebars */
  PANEL: 30,
  
  /** Overlays and dropdowns */
  OVERLAY: 40,
  
  /** Modals and dialogs */
  MODAL: 50,
  
  /** Tooltips and popovers */
  TOOLTIP: 100,
  
  /** High priority modals */
  MODAL_HIGH: 999,
  
  /** Highest priority (confirmations, critical modals) */
  MODAL_CRITICAL: 1000,
  
  /** Maximum z-index for special cases */
  MAX: 9999,
} as const;

