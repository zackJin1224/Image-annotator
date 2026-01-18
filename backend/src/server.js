import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import imageRoutes from "./routes/images.js";
import annotationRoutes from "./routes/annotations.js";
import pool from "./config/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
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
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

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

  app.listen(PORT, () => {
    console.log("=================================");
    console.log("🚀 Server started successfully!");
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log("=================================");
  });
};

startServer();

export default app;
