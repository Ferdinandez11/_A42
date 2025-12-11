// ============================================================================
// PDF MODULE - PUBLIC API
// Exports PDF generation, budget calculation, and document utilities
// ============================================================================

// PDF Engine Managers
export { PDFManager } from './engine/managers/PDFManager'
export { PDFDocumentBuilder } from './engine/managers/PDFDocumentBuilder'
export { PDFRenderer } from './engine/managers/PDFRenderer'
export { PDFSceneController } from './engine/managers/PDFSceneController'

// PDF Utilities
export * from './utils/pdfGenerator'

// Budget Utilities
export * from './utils/budgetUtils'

// Price Calculator
export { PriceCalculator } from './utils/PriceCalculator'