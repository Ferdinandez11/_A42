import { useEffect, useState } from "react";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useEngine } from "../context/EngineContext"; // 👈 Importamos hook
import { ArrowLeftRight } from "lucide-react";

export const CadControl = () => {
  const engine = useEngine(); // 👈 Obtenemos motor
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
    if (isNaN(val) || val <= 0 || !engine) return;

    if (mode === "DISTANCE") {
      engine.toolsManager.setSegmentLength(
        val,
        selectedVertexIndices[1],
        selectedVertexIndices[0]
      );
    } else {
      engine.toolsManager.setVertexAngle(val);
    }
  };

  const handleSwap = () => {
    if (engine) engine.toolsManager.swapSelectionOrder();
  };

  if (selectedVertexIndices.length < 2) return null;

  // ... (Resto del renderizado igual)
  return (
    <div
      className={`p-3 rounded-lg mb-3 border-l-4 shadow-lg ${
        mode === "ANGLE"
          ? "border-yellow-500 bg-neutral-800"
          : "border-blue-500 bg-neutral-800"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase text-white">
          {mode === "ANGLE" ? "📐 Ángulo" : "📏 Distancia"}
        </span>
        {mode === "DISTANCE" && (
          <button
            onClick={handleSwap}
            className="p-1 hover:bg-white/10 rounded text-blue-400"
            title="Cambiar dirección"
          >
            <ArrowLeftRight size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white font-mono"
        />
        <button
          onClick={handleApply}
          className="bg-blue-600 hover:bg-blue-500 px-3 rounded text-xs font-bold text-white"
        >
          OK
        </button>
      </div>
    </div>
  );
};