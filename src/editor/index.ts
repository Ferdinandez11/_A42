// ============================================================================
// EDITOR MODULE - PUBLIC API
// Exports 3D editor, engine, hooks, stores, and UI components
// ============================================================================

// Main Editor Component
export { default as Editor3D } from './Editor3D'

// Context
export { EngineContext, useEngine } from './context/EngineContext'

// Engine Core
export { A42Engine } from './engine/A42Engine'

// Engine Managers
export { ExportManager } from './engine/managers/ExportManager'
export { InteractionManager } from './engine/managers/InteractionManager'
export { ObjectManager } from './engine/managers/ObjectManager'
export { RecorderManager } from './engine/managers/RecorderManager'
export { SceneManager } from './engine/managers/SceneManager'
export { ToolsManager } from './engine/managers/ToolsManager'
export { WalkManager } from './engine/managers/WalkManager'

// Object Builders
export { FenceBuilder } from './engine/managers/objects/FenceBuilder'
export { FloorBuilder } from './engine/managers/objects/FloorBuilder'
export { ModelLoader } from './engine/managers/objects/ModelLoader'

// Tools
export { CADTool } from './engine/managers/tools/CADTool'
export { FenceTool } from './engine/managers/tools/FenceTool'
export { FloorTool } from './engine/managers/tools/FloorTool'

// Hooks
export { useEditorMedia } from './hooks/useEditorMedia'
export { useProjectActions } from './hooks/useProjectActions'
export { useSceneTools } from './hooks/useSceneTools'

// Stores
export { useCADStore } from './stores/cad/useCADStore'
export { useCatalogStore } from './stores/catalog/useCatalogStore'
export { useEditorStore } from './stores/editor/useEditorStore'
export { useFenceStore } from './stores/fence/useFenceStore'
export { useProjectStore } from './stores/project/useProjectStore'
export { useSceneStore } from './stores/scene/useSceneStore'
export { useSelectionStore } from './stores/selection/useSelectionStore'

// UI Components (públicos si se necesitan fuera del editor)
export { BudgetPanel } from './ui/BudgetPanel'
export { CadControl } from './ui/CadControl'
export { Catalog } from './ui/Catalog'
export { EnvironmentPanel } from './ui/EnvironmentPanel'
export { FenceProperties } from './ui/FenceProperties'
export { FloorProperties } from './ui/FloorProperties'
export { InputModal } from './ui/InputModal'
export { QRModal } from './ui/QRModal'
export { Toolbar } from './ui/Toolbar'

// Data
export { FENCE_PRESETS } from './data/fence_presets'