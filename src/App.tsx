import React from 'react';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import AnnotationList from './components/AnnotationList';
import { Box } from './types';




function App() {
  
  const [ imageUrl, setImageUrl ] = useState<string | null>( null );
  //Lifting state up
  const [ annotations, setAnnotations ] = useState<Box[]>( [] );
  const handleDelete = ( index: number )=>{
    setAnnotations( annotations.filter( ( box, i ) => i !== index ) );
  };

  const handleUpdateLabel = (index: number, newLabel: string) => {
    const updateAnnotations = [...annotations];
    updateAnnotations[index] = {
      ...updateAnnotations[index],
      label: newLabel,
    };
    setAnnotations(updateAnnotations);
  };


  return (
    <div className="h-screen flex flex-col">
      <Header onImageUpload={setImageUrl} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas
          imageUrl={ imageUrl }
          annotations={ annotations }
          setAnnotations={setAnnotations}
        />
        <AnnotationList
          annotations = { annotations }
          onDelete = { handleDelete }
          onUpdateLabel = {handleUpdateLabel}
        />
      </div>
    </div>
  );
}

export default App;
