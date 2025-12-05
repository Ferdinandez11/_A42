import { useState } from 'react';
import { useEngine } from '../context/EngineContext';


export const useEditorMedia = () => {
  const engine = useEngine();
  const [isRecording, setIsRecording] = useState(false);

  // --- FOTO Y VIDEO ---
  const takePhoto = async () => {
    if (!engine) return;
    await engine.recorderManager.takeScreenshot();
  };

  const start360Video = async () => {
    if (!engine) return;
    await engine.recorderManager.startOrbitAnimation();
  };

  const toggleRecording = () => {
    if (!engine) return;
    const manager = engine.recorderManager;
    
    if (isRecording) {
      manager.stopRecording();
      setIsRecording(false);
    } else {
      manager.startRecording();
      setIsRecording(true);
    }
  };

  // --- EXPORTACIÓN ---
  const exportGLB = async () => {
    if (!engine) return;
    await engine.exportManager.exportGLB();
  };

  const exportDXF = async () => {
    if (!engine) return;
    await engine.exportManager.exportDXF();
  };

  const generatePDF = async () => {
    if (!engine) return;
    await engine.pdfManager.generatePDF();
  };

  return {
    isRecording,
    takePhoto,
    start360Video,
    toggleRecording,
    exportGLB,
    exportDXF,
    generatePDF
  };
};