/**
 * Canvas Component
 * - Displays uploaded image
 * - Allows drawing annotation boxes with mouse
 * - Shows real-time red dashed box while drawing
 * - Shows completed green solid boxes
 */
import React, { useState, useRef, useEffect } from "react";
import { Box } from "../types";
import { generateRandomColor } from "../types";

interface CanvasProps {
  imageUrl: string | null;
  annotations: Box[];
  setAnnotations: ( boxes: Box[] ) => void;
  onDelete: ( index: number ) => void;
}

function Canvas({ imageUrl, annotations, setAnnotations,onDelete }: CanvasProps) {
  //Get the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Variables
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentBox, setCurrentBox] = useState<Box>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    label: "",
    color: ""
  });
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelInputPosition, setLabelInputPosition] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<Box | null>(null);
  const [labelInput, setLabelInput] = useState<string>("");

  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(-1);

  const isPointInBox = (x: number, y: number, box: Box): boolean => {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  //Mouse event functions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    //Get the position of mouse
    //Boundary check
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = Math.max(0, Math.min(e.nativeEvent.offsetX, canvas.width));
    const y = Math.max(0, Math.min(e.nativeEvent.offsetY, canvas.height));

    for (let i = annotations.length - 1; i >= 0; i--) {
      if (isPointInBox(x, y, annotations[i])) {
        setSelectedBoxIndex(i);
        return;
      }
    }

    setSelectedBoxIndex(-1);

    //Set drawing state
    setIsDrawing(true);

    //Record the position
    setCurrentBox({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      label: "unlabeled",
      color: generateRandomColor(),
    });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    //Update while drawing
    if (!isDrawing) return;

    //Get the current position
    //Boundary check
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = Math.max(0, Math.min(e.nativeEvent.offsetX, canvas.width));
    const y = Math.max(0, Math.min(e.nativeEvent.offsetY, canvas.height));

    //Update the destination only
    setCurrentBox({
      ...currentBox,
      endX: x,
      endY: y,
    });
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    //Check if if eligible
    const { startX, startY, endX, endY } = currentBox;
    if (startX !== endX && startY !== endY) {
      //Save temporary box
      const newBox = {
        ...currentBox,
        label: "",
        color: generateRandomColor(),
      };
      setTempBox(newBox);
      //Record the mouse positions
      setLabelInputPosition({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      });
      //Show the input box
      setShowLabelInput(true);
    }
    // Stop drawing
    setIsDrawing(false);
  };
  //Re-drawing
  useEffect(() => {
    //Check if image exists
    if (!imageUrl) return;
    //Check if canvas exists
    const canvas = canvasRef.current;
    if (!canvas) return;
    //Get and check the 2D drawing context
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    //Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //Create image object
    const img = new Image();
    //Run after image onloaded
    img.onload = () => {
      //Draw the image onto canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      //Draw all finished annotation boxes
      annotations.forEach((box,index) => {
        //Calculate width and height
        const width = box.endX - box.startX;
        const height = box.endY - box.startY;

        //Set the style
        if (index === selectedBoxIndex) {
          ctx.strokeStyle = "blue";
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = box.color;
          ctx.lineWidth = 2;
        }

        ctx.setLineDash([]);

        //Draw the box
        ctx.strokeRect(box.startX, box.startY, width, height);
      });

      //Draw the box line while drawing
      if (isDrawing) {
        const width = currentBox.endX - currentBox.startX;
        const height = currentBox.endY - currentBox.startY;

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentBox.startX, currentBox.startY, width, height);
      }
    };

    //Load image
    img.src = imageUrl;
  }, [ imageUrl, annotations, currentBox, isDrawing,selectedBoxIndex ] );
  

  useEffect( () =>
  {
    const handleKeyDown = ( e: KeyboardEvent ) =>
    {
      //Delete
      if ( (e.key === "Delete" || e.key === "Backspace") && selectedBoxIndex !== -1 )
      {
        onDelete( selectedBoxIndex );
        setSelectedBoxIndex( -1 );
        
      }
      //Esc
      if ( e.key === "Escape" && isDrawing )
      {
        setIsDrawing( false );
        setCurrentBox({
          startX: 0,
          startY: 0,
          endX: 0,
          endY: 0,
          label: "",
          color: "",
        });
      }
    };
    window.addEventListener( "keydown", handleKeyDown );
    return () => window.removeEventListener( "keydown", handleKeyDown );


  }, [ selectedBoxIndex, isDrawing, onDelete ] );


  //Return content
  return (
    <div className="flex-1 bg-white p-6 flex items-center justify-center overflow-auto">
      {imageUrl ? (
        <>
          <canvas
            ref={canvasRef}
            height={600}
            width={800}
            className="max-w-full max-h-full object-contain border-2 border-gray-300"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          {/* Label input box */}
          {showLabelInput && (
            <input
              type="text"
              placeholder="Enter label..."
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!tempBox) return;
                  const finalBox = {
                    ...tempBox,
                    label: labelInput,
                  };
                  setAnnotations([...annotations, finalBox]);

                  setShowLabelInput(false);
                  setLabelInput("");
                  setTempBox(null);
                }

                if (e.key === "Escape") {
                  setShowLabelInput(false);
                  setLabelInput("");
                  setTempBox(null);
                }
              }}
              className="absolute border-2 border-blue-500 rounded px-2 py-1 shadow-lg"
              style={{
                left: `${labelInputPosition.x}px`,
                top: `${labelInputPosition.y}px`,
              }}
            />
          )}
        </>
      ) : (
        <p className="text-gray-400 text-lg">
          Canvas area - Upload an image to start
        </p>
      )}
    </div>
  );
}

export default Canvas;
