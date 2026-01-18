import OpenAI from "openai";

const AI_ENABLED = false;
const API_KEY = (import.meta as any).env.VITE_OPENAI_API_KEY;

const openai =
  AI_ENABLED && API_KEY
    ? new OpenAI({
        apiKey: API_KEY,
        dangerouslyAllowBrowser: true,
      })
    : null;

export interface DetectedObject {
  label: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const aiService = {
  isEnabled: () => AI_ENABLED && !!API_KEY,

  async analyzeImage(imageUrl: string): Promise<DetectedObject[]> {
    if (!openai) {
      throw new Error("AI is not enabled");
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and detect all objects. For each object, provide:
1. A label (what the object is)
2. Bounding box coordinates as percentages (0-100) of image dimensions

Return ONLY a JSON array in this exact format:
[
  {
    "label": "person",
    "bbox": {"x": 10, "y": 20, "width": 30, "height": 40}
  }
]

Rules:
- x, y are top-left corner as percentages
- width, height are dimensions as percentages
- Detect 3-8 main objects
- Be precise with coordinates`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : "[]";

      return JSON.parse(jsonString);
    } catch (error) {
      console.error("AI analysis failed:", error);
      throw error;
    }
  },

  convertToAnnotations(
    objects: DetectedObject[],
    imageWidth: number,
    imageHeight: number
  ) {
    return objects.map((obj) => ({
      startX: (obj.bbox.x / 100) * imageWidth,
      startY: (obj.bbox.y / 100) * imageHeight,
      endX: ((obj.bbox.x + obj.bbox.width) / 100) * imageWidth,
      endY: ((obj.bbox.y + obj.bbox.height) / 100) * imageHeight,
      label: obj.label,
      color: this.generateRandomColor(),
    }));
  },

  generateRandomColor(): string {
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
    return colors[Math.floor(Math.random() * colors.length)];
  },
};
console.log("AI_ENABLED:", AI_ENABLED);
console.log("API_KEY exists:", !!API_KEY);
console.log("openai exists:", !!openai);
