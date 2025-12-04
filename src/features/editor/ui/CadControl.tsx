// --- START OF FILE src/features/editor/ui/CadControl.tsx ---
import { useEffect, useState } from "react";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { ArrowLeftRight, Ruler, ScanLine } from "lucide-react";

export const CadControl = () => {
  const selectedVertexIndices = useSelectionStore((s) => s.selectedVertices);
  const measuredDistance = useSelectionStore((s) => s.measuredDistance);
  const measuredAngle = useSelectionStore((s) => s.measuredAngle);

  const [inputValue, setInputValue] = useState<string>("");

  const mode = selectedVertexIndices.length === 3 ? "ANGLE" : "DISTANCE";

  useEffect(() => {
    if (mode === "ANGLE" && measuredAngle !== null) {
      setInputValue(measuredAngle.toFixed(1));
    } else if (mode === "DISTANCE" && measuredDistance !== null) {
      setInputValue(measuredDistance.toFixed(3));
    }
  }, [measuredDistance, measuredAngle, mode]);

  const handleApply = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) return;

    // @ts-ignore
    if (window.editorEngine) {
      if (mode === "DISTANCE") {
        window.editorEngine.toolsManager.setSegmentLength(
          val,
          selectedVertexIndices[1],
          selectedVertexIndices[0]
        );
      } else {
        window.editorEngine.toolsManager.setVertexAngle(val);
      }
    }
  };

  const handleSwap = () => {
    // @ts-ignore
    if (window.editorEngine)
      window.editorEngine.toolsManager.swapSelectionOrder();
  };

  if (selectedVertexIndices.length < 2) return null;

  return (
    <div
      className={`p-3 rounded-lg mb-3 border-l-4 shadow-lg ${
        mode === "ANGLE"
          ? "border-yellow-500 bg-neutral-800"
          : "border-blue-500 bg-neutral-800"
      }`}
    >
      {/* ... resto igual ... */}
    </div>
  );
};
// --- END OF FILE ---
