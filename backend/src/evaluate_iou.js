import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Ground Truth ─────────────────────────────────────────────────────────────
const GROUND_TRUTH = {
  image: { fileName: "bdd_street_002.jpg", width: 800, height: 600 },
  annotations: [
    { id: 1, label: "car", x: 268, y: 295, width: 104, height: 136 },
    { id: 2, label: "car", x: 375, y: 307, width: 50, height: 73 },
    { id: 3, label: "car", x: 411, y: 342, width: 51, height: 62 },
    { id: 4, label: "pedestrian", x: 707, y: 314, width: 41, height: 105 },
    { id: 5, label: "ads board", x: 14, y: 97, width: 118, height: 212 },
  ],
};

// ─── Prompts ──────────────────────────────────────────────────────────────────
const DOMAIN_SPECIFIC_PROMPT = `You are an autonomous driving perception assistant. Analyze this driving scene image and detect all relevant objects.

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
- x, y are top-left corner as percentages of image dimensions
- width, height are dimensions as percentages
- Detect ALL visible objects in the scene`;

const GENERAL_PROMPT = `Analyze this image and detect all main objects.

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
- Detect 3-8 main objects`;

// ─── IoU Calculation ──────────────────────────────────────────────────────────
function calculateIoU(boxA, boxB) {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;

  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;

  return interArea / (areaA + areaB - interArea);
}

function evaluatePredictions(gtAnnotations, predictions, imgWidth, imgHeight) {
  const results = [];

  for (const gt of gtAnnotations) {
    let bestIoU = 0;
    let bestPred = null;

    for (const pred of predictions) {
      const predBox = {
        x: (pred.bbox.x / 100) * imgWidth,
        y: (pred.bbox.y / 100) * imgHeight,
        width: (pred.bbox.width / 100) * imgWidth,
        height: (pred.bbox.height / 100) * imgHeight,
      };

      const iou = calculateIoU(gt, predBox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestPred = pred;
      }
    }

    results.push({
      gtLabel: gt.label,
      predLabel: bestPred?.label ?? "none",
      iou: parseFloat(bestIoU.toFixed(3)),
      matched: bestIoU >= 0.3,
    });
  }

  return results;
}

// ─── GPT-4 Vision Call ────────────────────────────────────────────────────────
async function runGPT4Vision(imagePath, prompt) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");
  const ext = path.extname(imagePath).slice(1);
  const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0.2,
  });

  const content = response.choices[0].message.content || "[]";
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const imagePath = path.join(
    __dirname,
    "../uploads",
    GROUND_TRUTH.image.fileName,
  );

  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }

  const { width, height } = GROUND_TRUTH.image;
  const gt = GROUND_TRUTH.annotations;

  console.log("=".repeat(60));
  console.log("IoU Evaluation: Domain-Specific vs General Prompt");
  console.log("=".repeat(60));
  console.log(`Image: ${GROUND_TRUTH.image.fileName}`);
  console.log(`Ground Truth: ${gt.length} annotations\n`);

  // ── Domain-Specific Prompt ──
  console.log("Running domain-specific prompt...");
  const domainPreds = await runGPT4Vision(imagePath, DOMAIN_SPECIFIC_PROMPT);
  const domainResults = evaluatePredictions(gt, domainPreds, width, height);
  const domainMatchRate =
    domainResults.filter((r) => r.matched).length / gt.length;
  const domainAvgIoU = domainResults.reduce((s, r) => s + r.iou, 0) / gt.length;

  console.log("\n[Domain-Specific Prompt Results]");
  console.table(domainResults);
  console.log(`Match Rate (IoU≥0.3): ${(domainMatchRate * 100).toFixed(1)}%`);
  console.log(`Average IoU: ${domainAvgIoU.toFixed(3)}`);

  // ── General Prompt ──
  console.log("\nRunning general prompt...");
  const generalPreds = await runGPT4Vision(imagePath, GENERAL_PROMPT);
  const generalResults = evaluatePredictions(gt, generalPreds, width, height);
  const generalMatchRate =
    generalResults.filter((r) => r.matched).length / gt.length;
  const generalAvgIoU =
    generalResults.reduce((s, r) => s + r.iou, 0) / gt.length;

  console.log("\n[General Prompt Results]");
  console.table(generalResults);
  console.log(`Match Rate (IoU≥0.3): ${(generalMatchRate * 100).toFixed(1)}%`);
  console.log(`Average IoU: ${generalAvgIoU.toFixed(3)}`);

  // ── Summary ──
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`${"Metric".padEnd(30)} ${"Domain-Specific".padEnd(20)} General`);
  console.log("-".repeat(60));
  console.log(
    `${"Match Rate (IoU≥0.3)".padEnd(30)} ${(domainMatchRate * 100).toFixed(1).padEnd(20)}% ${(generalMatchRate * 100).toFixed(1)}%`,
  );
  console.log(
    `${"Average IoU".padEnd(30)} ${domainAvgIoU.toFixed(3).padEnd(20)} ${generalAvgIoU.toFixed(3)}`,
  );
  console.log(
    `${"Detections".padEnd(30)} ${String(domainPreds.length).padEnd(20)} ${generalPreds.length}`,
  );
  console.log("=".repeat(60));
}

main().catch(console.error);
