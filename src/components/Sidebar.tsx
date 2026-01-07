import React from "react";

function Sidebar()
{
  return (
    <div className="w-64 bg-gray-100 p-4 overflow-y-auto border-r border-gray-300">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 text-center">
        Image State
      </h2>
      <p className="text-sm text-gray-500 text-center">No images yet</p>
    </div>
  );
}

export default Sidebar;