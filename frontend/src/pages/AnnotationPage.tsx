import React, { useCallback, useEffect } from "react";
import { useAnnotationStore } from "../store/useAnnotationStore";
import Sidebar from "../components/Sidebar";
import Canvas from "../components/Canvas";
import AnnotationList from "../components/AnnotationList";
import { Box } from "../types";
import { aiService } from "../services/aiService";
import toast from "react-hot-toast";

function AnnotationPage() {
  const {
    images,
    currentImageIndex,
    getCurrentImage,
    getAnnotations,
    addImage,
    deleteImage,
    selectImage,
    setAnnotations,
    saveAnnotations,
    deleteAnnotation,
    updateLabel,
    exportJSON,
    undo,
    redo,
    loadImages,
  } = useAnnotationStore();

  const currentImage = getCurrentImage();
  const annotations = getAnnotations();

  const handleAIAnnotate = async () => {
    const currentImage = getCurrentImage();
    if (!currentImage || !aiService.isEnabled()) {
      toast.error("AI feature is not available");
      return;
    }

    toast.loading("AI is analyzing the image...", { id: "ai-loading" });

    try {
      
      const domain = aiService.detectDomain(currentImage.fileName);
      console.log("Detected domain:", domain); 

      const detectedObjects = await aiService.analyzeImage(
        currentImage.url,
        domain, 
      );

      const canvas = document.querySelector("canvas");
      if (!canvas) throw new Error("Canvas not found");

      const newAnnotations = aiService.convertToAnnotations(
        detectedObjects,
        canvas.width,
        canvas.height,
      );

      setAnnotations([...annotations, ...newAnnotations]);
      await saveAnnotations();

      toast.success(
        `[${domain}] Detected ${newAnnotations.length} objects!`, 
        { id: "ai-loading" },
      );
    } catch (error) {
      console.error("AI annotation failed:", error);
      toast.error("AI annotation failed", { id: "ai-loading" });
    }
  };

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "z" || event.key === "Z") &&
        !event.shiftKey;

      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "z" || event.key === "Z") &&
        event.shiftKey;

      const isRedoAlt =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "y" || event.key === "Y");

      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (isRedo || isRedoAlt) {
        event.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleAddImage = async (file: File) => {
    await addImage(file);
  };
  const handleSelectImage = useCallback(selectImage, [selectImage]);
  const handleSetAnnotations = useCallback(
    async (annotations: Box[]) => {
      setAnnotations(annotations);
      await saveAnnotations();
    },
    [setAnnotations, saveAnnotations],
  );
  const handleDeleteAnnotation = useCallback(deleteAnnotation, [
    deleteAnnotation,
  ]);
  const handleUpdateLabel = useCallback(updateLabel, [updateLabel]);

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50 border-t border-gray-200">
      <Sidebar
        images={images}
        currentImageIndex={currentImageIndex}
        onAddImage={handleAddImage}
        onSelectImage={handleSelectImage}
        onDeleteImage={deleteImage}
      />
      <Canvas
        imageUrl={currentImage?.url || null}
        annotations={annotations}
        setAnnotations={handleSetAnnotations}
        onDelete={handleDeleteAnnotation}
        onAIAnnotate={handleAIAnnotate}
      />
      <AnnotationList
        annotations={annotations}
        onDelete={handleDeleteAnnotation}
        onUpdateLabel={handleUpdateLabel}
        onExport={exportJSON}
        hasAnnotations={annotations.length > 0}
      />
    </div>
  );
}

export default AnnotationPage;
