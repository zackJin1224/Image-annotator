export type Box = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label: string;
  color: string;
};

export function generateRandomColor (): string
{
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}