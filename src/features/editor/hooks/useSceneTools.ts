import { useEngine } from '../context/EngineContext';

export const useSceneTools = () => {
  const engine = useEngine();

  const activateWalkMode = () => {
    engine?.walkManager.enable();
  };

  const setCadSegment = (length: number, idxMove: number, idxAnchor: number) => {
    engine?.toolsManager.setSegmentLength(length, idxMove, idxAnchor);
  };

  const setCadAngle = (angle: number) => {
    engine?.toolsManager.setVertexAngle(angle);
  };
  
  const swapCadSelection = () => {
    engine?.toolsManager.swapSelectionOrder();
  };

  return {
    activateWalkMode,
    setCadSegment,
    setCadAngle,
    swapCadSelection
  };
};