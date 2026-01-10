import React, { useState } from "react";
import { Box } from "../types";

interface AnnotationListProps {
  annotations: Box[];
  onDelete: (index: number) => void;
  onUpdateLabel: (index: number, newLabel: string) => void;
}

function AnnotationList({
  annotations,
  onDelete,
  onUpdateLabel,
}: AnnotationListProps) {
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editValue, setEditValue] = useState<string>("");

  return (
    <div className="w-64 bg-gray-50 p-4 overflow-y-auto border-l border-gray-300">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 text-center">
        Annotations({annotations.length})
      </h2>
      {annotations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center">No annotations yet</p>
      ) : (
        <ul className="space-y-2">
          {/*Display annotations*/}
          {annotations.map((box, index) => (
            <li key={index}>
              <div className="bg-white p-3 rounded border border-gray-200">
                {/*Show Box number and delete button*/}
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm text-gray-700">
                    Box #{index + 1}
                  </span>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm"
                    onClick={() => onDelete(index)}
                  >
                    Delete
                  </button>
                </div>
                {/*Show cooradinates info*/}
                <div className="text-xs text-gray-600 space-y-1">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (!editValue) return;
                          onUpdateLabel(editingIndex, editValue);
                          setEditingIndex(-1);
                          setEditValue("");
                        }
                        if (e.key === "Escape") {
                          setEditingIndex(-1);
                          setEditValue("");
                        }
                      }}
                      autoFocus
                      className="border border-blue-500 rounded px-1 py-0.5 text-xs w-full"
                    />
                  ) : (
                    <p
                      onClick={() => {
                        setEditingIndex(index);
                        setEditValue(box.label);
                      }}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      Label: {box.label}
                    </p>
                  )}

                  <p>
                    Start: ({box.startX},{box.startY})
                  </p>
                  <p>
                    End: ({box.endX},{box.endY})
                  </p>

                  <p>
                    Size: {Math.abs(box.endX - box.startX)} *{" "}
                    {Math.abs(box.endY - box.startY)}{" "}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default AnnotationList;
