/**
 * Canvas Component
 * - Displays uploaded image
 * - Allows drawing annotation boxes with mouse
 * - Shows real-time red dashed box while drawing
 * - Shows completed green solid boxes
 */
import React, { useState, useRef, useEffect } from "react";
import { start } from "repl";

type Box = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

interface CanvasProps {
  imageUrl: string | null;
}

function Canvas({ imageUrl }: CanvasProps) {
  //Get the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Variables
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentBox, setCurrentBox] = useState<Box>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
  const [annotations, setAnnotations] = useState<Box[]>([]);

  //Mouse event functions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    //Set drawing state
    setIsDrawing(true);
    //Get the position of mouse
    //Boundary check
    const canvas = canvasRef.current;
    if ( !canvas ) return;
    const x = Math.max(0,Math.min(e.nativeEvent.offsetX,canvas.width));
    const y = Math.max(0,Math.min(e.nativeEvent.offsetY,canvas.height));
    //Record the position
    setCurrentBox({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
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
    } );
    
  };
  const handleMouseUp = () => {
    if (!isDrawing) return;

    //Check if if eligible
    const { startX, startY, endX, endY } = currentBox;
    if (startX !== endX && startY !== endY) {
      setAnnotations([...annotations, currentBox]);
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
      annotations.forEach((box) => {
        //Calculate width and height
        const width = box.endX - box.startX;
        const height = box.endY - box.startY;

        //Set the style
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
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
  }, [imageUrl, annotations, currentBox, isDrawing]);

  //Return content
  return (
    <div className="flex-1 bg-white p-6 flex items-center justify-center overflow-auto">
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          height={600}
          width={800}
          className="max-w-full max-h-full object-contain border-2 border-gray-300"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      ) : (
        <p className="text-gray-400 text-lg">
          Canvas area - Upload an image to start
        </p>
      )}
    </div>
  );
}

export default Canvas;
