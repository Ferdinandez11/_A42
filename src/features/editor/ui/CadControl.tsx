import { useEffect, useState } from "react";
import { useCADStore } from "@/stores/cad/useCADStore"; 
import { useSceneTools } from "../hooks/useSceneTools"; // 👈 Hook nuevo
import { ArrowLeftRight } from "lucide-react";

export const CadControl = () => {
  const { setCadSegment, setCadAngle, swapCadSelection } = useSceneTools();
  
  const selectedVertexIndices = useCADStore((s) => s.selectedVertices);
  const dist = useCADStore((s) => s.distance);
  const angle = useCADStore((s) => s.angle);

  const [inputValue, setInputValue] = useState<string>("");

  const mode = selectedVertexIndices.length === 3 ? "ANGLE" : "DISTANCE";

  useEffect(() => {
      if (mode === "ANGLE" && angle !== null) {
        setInputValue(angle.toFixed(1));
      } else if (mode === "DISTANCE" && dist !== null) {
        setInputValue(dist.toFixed(3));
      }
    }, [dist, angle, mode]);

  const handleApply = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) return;

    if (mode === "DISTANCE") {
      setCadSegment(val, selectedVertexIndices[1], selectedVertexIndices[0]);
    } else {
      setCadAngle(val);
    }
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
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase text-white">
          {mode === "ANGLE" ? "📐 Ángulo" : "📏 Distancia"}
        </span>
        {mode === "DISTANCE" && (
          <button
            onClick={swapCadSelection}
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