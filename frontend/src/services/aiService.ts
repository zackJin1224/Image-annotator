import OpenAI from "openai";

const AI_ENABLED = false;
const API_KEY = process.env.REACT_APP_OPENAI_API_KEY || "YOU API HERE";

const openai =
  AI_ENABLED && API_KEY
    ? new OpenAI({
        apiKey: API_KEY,
        dangerouslyAllowBrowser: true,
      })
    : null;

export type ImageDomain = "medical" | "autonomous_driving" | "general";

export interface DetectedObject {
  label: string;
  confidence?: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ─── Prompts ────────────────────────────────────────────────────────────────

const PROMPTS: Record<ImageDomain, string> = {
  medical: `You are a medical image analysis assistant. Analyze this medical image (chest X-ray, fundus photo, or skin lesion image) and identify abnormal regions.

For each finding, provide:
1. A concise medical label (e.g. "Cardiomegaly", "Pleural Effusion", "Optic Disc", "Skin Lesion", "Nodule")
2. Bounding box as percentages (0-100) of image dimensions
3. Confidence score (0.0-1.0)

Return ONLY a valid JSON array, no extra text:
[
  {
    "label": "Cardiomegaly",
    "confidence": 0.87,
    "bbox": {"x": 30, "y": 25, "width": 40, "height": 35}
  }
]

Rules:
- x, y are top-left corner as percentages
- width, height are dimensions as percentages
- Focus on clinically significant regions (abnormalities, key anatomical landmarks)
- Detect 2-6 regions
- If no abnormality is found, still return notable anatomical landmarks
- Be conservative with confidence scores`,

  autonomous_driving: `You are an autonomous driving perception assistant. Analyze this driving scene image and detect all relevant objects.

Detect and label:
- Vehicles: "Car", "Truck", "Bus", "Motorcycle", "Bicycle"
- Vulnerable road users: "Pedestrian", "Cyclist"
- Infrastructure: "Traffic Light", "Stop Sign", "Traffic Sign"
- Road elements: "Lane Marking", "Crosswalk"

Return ONLY a valid JSON array, no extra text:
[
  {
    "label": "Car",
    "confidence": 0.95,
    "bbox": {"x": 10, "y": 40, "width": 20, "height": 25}
  }
]

Rules:
- x, y are top-left corner as percentages
- width, height are dimensions as percentages
- Detect ALL visible objects in the scene (typically 5-15 objects)
- Prioritize pedestrians and vehicles closest to the camera
- Include partially visible objects at image edges`,

  general: `Analyze this image and detect all main objects.

Return ONLY a valid JSON array, no extra text:
[
  {
    "label": "person",
    "confidence": 0.9,
    "bbox": {"x": 10, "y": 20, "width": 30, "height": 40}
  }
]

Rules:
- x, y are top-left corner as percentages
- width, height are dimensions as percentages
- Detect 3-8 main objects`,
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const aiService = {
  isEnabled: () => AI_ENABLED && !!API_KEY,

  detectDomain(fileName: string): ImageDomain {
    const name = fileName.toLowerCase();
    if (
      name.includes("xray") ||
      name.includes("chest") ||
      name.includes("fundus") ||
      name.includes("skin") ||
      name.includes("lesion") ||
      name.includes("medical") ||
      name.includes("nih") ||
      name.includes("kaggle_med")
    )
      return "medical";

    if (
      name.includes("kitti") ||
      name.includes("bdd") ||
      name.includes("driving") ||
      name.includes("street") ||
      name.includes("road") ||
      name.includes("traffic")
    )
      return "autonomous_driving";

    return "general";
  },

  async analyzeImage(
    imageUrl: string,
    domain: ImageDomain = "general",
  ): Promise<DetectedObject[]> {
    if (!openai) throw new Error("AI is not enabled or API key missing");

    let imageContent: OpenAI.Chat.ChatCompletionContentPartImage;
    if (
      imageUrl.startsWith("http://localhost") ||
      imageUrl.startsWith("blob:")
    ) {
      const base64 = await fetchImageAsBase64(imageUrl);
      imageContent = {
        type: "image_url",
        image_url: { url: base64 },
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: { url: imageUrl },
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: PROMPTS[domain] }, imageContent],
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || "[]";
    return parseDetectedObjects(content);
  },

  convertToAnnotations(
    objects: DetectedObject[],
    imageWidth: number,
    imageHeight: number,
  ) {
    return objects.map((obj) => ({
      startX: (obj.bbox.x / 100) * imageWidth,
      startY: (obj.bbox.y / 100) * imageHeight,
      endX: ((obj.bbox.x + obj.bbox.width) / 100) * imageWidth,
      endY: ((obj.bbox.y + obj.bbox.height) / 100) * imageHeight,
      label:
        obj.confidence !== undefined
          ? `${obj.label} (${Math.round(obj.confidence * 100)}%)`
          : obj.label,
      color:
        obj.confidence !== undefined
          ? getConfidenceColor(obj.confidence)
          : generateRandomColor(),
    }));
  },

  generateRandomColor,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDetectedObjects(content: string): DetectedObject[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : "[]";
    return JSON.parse(jsonString);
  } catch {
    console.error("Failed to parse AI response:", content);
    return [];
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#22c55e";
  if (confidence >= 0.5) return "#f59e0b";
  return "#ef4444";
}

function generateRandomColor(): string {
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
}

export { generateRandomColor };
