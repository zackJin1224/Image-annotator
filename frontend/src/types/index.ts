export type Box = {
  id?: string;
  version?: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label: string;
  color: string;
};

export function generateRandomColor(): string {
  const colors = [
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ef4444",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#8b5cf6",
  ];

  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

export type ImageData = {
  id: string;
  url: string;
  fileName: string;
  annotations: Box[];
};
