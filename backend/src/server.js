import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createClient } from "redis";

import imageRoutes from "./routes/images.js";
import annotationRoutes from "./routes/annotations.js";
import pool from "./config/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

const server = createServer(app);

// ─── Redis ────────────────────────────────────────────────────────────────────
const publisher = createClient({ url: "redis://localhost:6379" });
const subscriber = createClient({ url: "redis://localhost:6379" });

await publisher.connect();
await subscriber.connect();
console.log("Redis connected");

// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

const clients = new Map();

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "join") {
        clients.set(ws, msg.imageId);
        console.log(`Client joined image: ${msg.imageId}`);
      }
    } catch (e) {
      console.error("WS message parse error:", e);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("WebSocket client disconnected");
  });
});

await subscriber.subscribe("annotation-updates", (message) => {
  const data = JSON.parse(message);
  data.serverBroadcastTime = Date.now();
  const { imageId } = data;

  for (const [ws, subscribedImageId] of clients.entries()) {
    if (subscribedImageId === imageId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
});
console.log("Subscribed to annotation-updates");

app.set("redisPublisher", publisher);

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://image-annotator-theta.vercel.app",
      ];
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        /\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/images", imageRoutes);
app.use("/api", annotationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ─── Database ─────────────────────────────────────────────────────────────────
const testDatabaseConnection = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
        start_x FLOAT NOT NULL,
        start_y FLOAT NOT NULL,
        end_x FLOAT NOT NULL,
        end_y FLOAT NOT NULL,
        label VARCHAR(100) NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
      CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
    `);

    console.log("Tables created/verified");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await testDatabaseConnection();

  server.listen(PORT, () => {
    console.log("=================================");
    console.log("🚀 Server started successfully!");
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log("=================================");
  });
};

startServer();

export default app;
