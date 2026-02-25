import Annotation from "../models/Annotation.js";
import pool from "../config/database.js";

class AnnotationController {
  static async createAnnotation(req, res) {
    try {
      const { imageId } = req.params;
      const { startX, startY, endX, endY, label } = req.body;

      if (
        startX === undefined ||
        startY === undefined ||
        endX === undefined ||
        endY === undefined ||
        !label
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const annotation = await Annotation.create({
        imageId,
        startX,
        startY,
        endX,
        endY,
        label,
      });

      res.status(201).json({
        success: true,
        data: annotation,
      });
    } catch (error) {
      console.error("Error creating annotation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create annotation",
      });
    }
  }

  static async getAnnotationsByImageId(req, res) {
    try {
      const { imageId } = req.params;
      const annotations = await Annotation.findByImageId(imageId);

      res.json({
        success: true,
        data: annotations,
      });
    } catch (error) {
      console.error("Error getting annotations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get annotations",
      });
    }
  }

  static async updateAnnotation(req, res) {
    try {
      const { id } = req.params;
      const { label } = req.body;
      const version = parseInt(req.body.version, 10);

      if (version === undefined) {
        return res.status(400).json({
          success: false,
          error: "Missing version field",
        });
      }

      const client = await pool.connect();

      try {
        const current = await client.query(
          "SELECT version FROM annotations WHERE id = $1",
          [id],
        );

        if (current.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Annotation not found",
          });
        }

        if (current.rows[0].version !== version) {
          return res.status(409).json({
            success: false,
            error: "Conflict: annotation was modified by another user",
            currentVersion: current.rows[0].version,
          });
        }

        const result = await client.query(
          `UPDATE annotations 
        SET label = $1, version = version + 1, updated_at = NOW()
          WHERE id = $2 AND version = $3
        RETURNING *`,
          [label, id, version],
        );

        if (result.rows.length === 0) {
          return res.status(409).json({
            success: false,
            error: "Conflict: please retry",
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating annotation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update annotation",
      });
    }
  }

  static async deleteAnnotation(req, res) {
    try {
      const { id } = req.params;

      const annotation = await Annotation.delete(id);

      if (!annotation) {
        return res.status(404).json({
          success: false,
          error: "Annotation not found",
        });
      }

      res.json({
        success: true,
        message: "Annotation deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete annotation",
      });
    }
  }

  static async createBatchAnnotations(req, res) {
    try {
      const { imageId } = req.params;
      const { annotations, clientId } = req.body;

      if (!Array.isArray(annotations) || annotations.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid annotations array",
        });
      }

      const createdAnnotations = await Annotation.createBatch(
        imageId,
        annotations,
      );

      res.status(201).json({
        success: true,
        data: createdAnnotations,
      });
    } catch (error) {
      console.error("Error creating batch annotations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create annotations",
      });
    }
  }
  static async replaceAllAnnotations(req, res) {
    try {
      const { imageId } = req.params;
      const { annotations, clientId } = req.body;

      if (!Array.isArray(annotations)) {
        return res.status(400).json({
          success: false,
          error: "Invalid annotations array",
        });
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        await client.query("DELETE FROM annotations WHERE image_id = $1", [
          imageId,
        ]);

        const createdAnnotations = [];

        for (const ann of annotations) {
          const query = `
          INSERT INTO annotations (image_id, start_x, start_y, end_x, end_y, label)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

          const values = [
            imageId,
            ann.startX,
            ann.startY,
            ann.endX,
            ann.endY,
            ann.label,
          ];
          const result = await client.query(query, values);
          createdAnnotations.push(result.rows[0]);
        }

        await client.query("COMMIT");
        const publisher = req.app.get("redisPublisher");
        console.log("Publisher exists:", !!publisher);
        if (publisher) {
          await publisher.publish(
            "annotation-updates",
            JSON.stringify({
              type: "annotation-update",
              imageId,
              annotations: createdAnnotations,
              clientId,
            }),
          );
        }
        res.json({
          success: true,
          data: createdAnnotations,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error replacing annotations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to replace annotations",
      });
    }
  }
}

export default AnnotationController;
