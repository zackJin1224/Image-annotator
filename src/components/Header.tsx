/**
onChange: React.ChangeEvent<HTMLInputElement>
onClick: React.MouseEvent<HTMLButtonElement>
onSubmit: React.FormEvent<HTMLFormElement>
 */
import React from "react";

interface HeaderProps
{
  onImageUpload: ( url: string ) => void;
  onExport: () => void;
  hasImage: boolean;
  hasAnnotations: boolean;
  onFileNameChange: ( name: string ) => void;
}

function Header ( { onFileNameChange,onImageUpload,onExport,hasImage,hasAnnotations }: HeaderProps )
{
  const handleFileChange = ( event: React.ChangeEvent<HTMLInputElement> ) =>
  {
    const file = event.target.files?.[ 0 ];
    if ( file )
    {
      const reader = new FileReader();
      reader.onload = ( e ) =>
      {
        const url = e.target?.result as string;
        onImageUpload( url );
        onFileNameChange( file.name );
      };
      reader.readAsDataURL( file );
    }
  };

  
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="relative flex items-center justify-center">
        <h1 className="text-2xl font-bold">Image Annotation Tool</h1>

        <div className="absolute right-0 flex gap-4">
          <button
            onClick={onExport}
            disabled={!hasImage || !hasAnnotations}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export JSON
          </button>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            id="file-upload"
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded cursor-pointer inline-block"
          >
            Upload Image
          </label>
        </div>
      </div>
    </header>
  );
}

export default Header;
