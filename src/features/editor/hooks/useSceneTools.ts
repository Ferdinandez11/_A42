// --- FILE: src/features/editor/hooks/useSceneTools.ts ---
import { useEngine } from "../context/EngineContext";

export const useSceneTools = () => {
  const engine = useEngine();

  const activateWalkMode = () => {
    engine?.walkManager.enable();
  };

  const setCadSegment = (length: number, idxMove: number, idxAnchor: number) => {
    const tools = engine?.toolsManager as any;
    tools?.setSegmentLength?.(length, idxMove, idxAnchor);
  };

  const setCadAngle = (angle: number) => {
    const tools = engine?.toolsManager as any;
    tools?.setVertexAngle?.(angle);
  };

  const swapCadSelection = () => {
    const tools = engine?.toolsManager as any;
    tools?.swapSelectionOrder?.();
  };

  return {
    activateWalkMode,
    setCadSegment,
    setCadAngle,
    swapCadSelection,
  };
};
