import { useEffect } from "react";
import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import AnnotationList from "./components/AnnotationList";
import { useHistory } from "./hooks/useHistory";

function App() {
  const [fileName, setFileName] = useState<string>("");

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const {
    state: annotations,
    set: setAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory([]);
  const handleDelete = (index: number) => {
    setAnnotations(annotations.filter((box, i) => i !== index));
  };

  const handleExport = () => {
    if (!imageUrl) return;

    const annotationsData = annotations.map((box, index) => ({
      id: index + 1,
      label: box.label,
      x: Math.min(box.startX, box.endX),
      y: Math.min(box.startY, box.endY),
      width: Math.abs(box.endX - box.startX),
      height: Math.abs(box.endY - box.startY),
    }));

    const exportData = {
      image: {
        fileName: fileName || "image.jpg",
        width: 800,
        height: 600,
      },
      annotations: annotationsData,
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    //Blob:binary large object
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    a.download = `annotations_${timestamp}.json`;

    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateLabel = (index: number, newLabel: string) => {
    const updateAnnotations = [...annotations];
    updateAnnotations[index] = {
      ...updateAnnotations[index],
      label: newLabel,
    };
    setAnnotations(updateAnnotations);
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && e.key === "z") || e.key === "y")
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onImageUpload={setImageUrl}
        onExport={handleExport}
        hasImage={imageUrl !== null}
        hasAnnotations={annotations.length > 0}
        onFileNameChange={setFileName}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas
          imageUrl={imageUrl}
          annotations={annotations}
          setAnnotations={setAnnotations}
          onDelete={handleDelete}
        />
        <AnnotationList
          annotations={annotations}
          onDelete={handleDelete}
          onUpdateLabel={handleUpdateLabel}
        />
      </div>
    </div>
  );
}

export default App;
