import { useEffect } from "react";
import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import AnnotationList from "./components/AnnotationList";
import { useHistory } from "./hooks/useHistory";

function App() {
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
      <Header onImageUpload={setImageUrl} />
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
