import "dotenv/config";
import express from "express";
import { createServer } from "http";
import multer from "multer";
import { existsSync, unlinkSync } from "fs";
import PDFDocument from "pdfkit";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { registerAuthRoutes } from "../auth";
import {
  getRecipeById,
  getIngredientsByRecipeId,
  getStepsByRecipeId,
  getTagsByRecipeId,
  getImagesByRecipeId,
} from "../db";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Standard email/password auth routes
  registerAuthRoutes(app);

  // Image upload endpoint
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  });
  app.post("/api/upload-image", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const { buffer, mimetype, originalname } = req.file;
      const ext = originalname.split(".").pop() || "jpg";
      const key = `recipe-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, mimetype);
      if (!url) {
        return res.status(500).json({
          error:
            "Image storage is not configured. Please set S3 env vars (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL).",
        });
      }
      return res.json({ url });
    } catch (err) {
      console.error("[Image Upload] Error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  // PDF export endpoint – PDFKit + NotoSansCJK fonts from CDN
  const FONT_REGULAR_URL =
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663407123189/Rxf5k8E5vvXYtGGv2mJZZf/NotoSansCJKsc-Regular_c5ac66fe.otf";
  const FONT_BOLD_URL =
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663407123189/Rxf5k8E5vvXYtGGv2mJZZf/NotoSansCJKsc-Bold_85197231.otf";
  let _fontRegular: Buffer | null = null;
  let _fontBold: Buffer | null = null;

  async function getFont(url: string): Promise<Buffer> {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) throw new Error(`Font fetch failed: ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  }
  async function ensureFonts() {
    if (!_fontRegular) _fontRegular = await getFont(FONT_REGULAR_URL);
    if (!_fontBold) _fontBold = await getFont(FONT_BOLD_URL);
  }

  app.get("/api/export-pdf/:recipeId", async (req: any, res: any) => {
    const tmpFiles: string[] = [];
    try {
      const { recipeId } = req.params;
      const recipe = await getRecipeById(recipeId, 0);
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });

      const [ingredientRows, stepRows, tagRows, imageRows] = await Promise.all([
        getIngredientsByRecipeId(recipeId),
        getStepsByRecipeId(recipeId),
        getTagsByRecipeId(recipeId),
        getImagesByRecipeId(recipeId),
      ]);

      await ensureFonts();

      let imgBuffer: Buffer | null = null;
      const firstImageUrl = imageRows[0]?.url || (recipe as any).imageUrl;
      if (firstImageUrl) {
        try {
          const imgResp = await fetch(firstImageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeExporter/1.0)" },
            signal: AbortSignal.timeout(15000),
          });
          if (imgResp.ok) imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        } catch (imgErr: any) {
          console.warn(`[PDF Export] Image download error: ${imgErr?.message}`);
        }
      }

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      doc.registerFont("Regular", _fontRegular!);
      doc.registerFont("Bold", _fontBold!);

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      const pdfDone = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });

      const pageWidth = doc.page.width - 100;
      const primaryColor = "#C0392B";
      const textColor = "#1a1a1a";
      const mutedColor = "#666666";
      const borderColor = "#e5e5e5";

      doc.font("Bold").fontSize(26).fillColor(textColor).text(recipe.title, { align: "left" });
      doc.moveDown(0.3);

      const metaParts: string[] = [];
      if ((recipe as any).servings) metaParts.push(`${(recipe as any).servings} 份`);
      if ((recipe as any).prepTime) metaParts.push(`准备 ${(recipe as any).prepTime} 分钟`);
      if ((recipe as any).cookTime) metaParts.push(`烹饪 ${(recipe as any).cookTime} 分钟`);
      if (metaParts.length > 0) {
        doc.font("Regular").fontSize(11).fillColor(mutedColor).text(metaParts.join("  ·  "));
        doc.moveDown(0.3);
      }

      const metaLine2: string[] = [];
      if ((recipe as any).category) metaLine2.push(`分类：${(recipe as any).category}`);
      if (tagRows.length > 0) metaLine2.push(tagRows.map((t) => `#${t.tag}`).join(" "));
      if (metaLine2.length > 0) {
        doc.font("Regular").fontSize(10).fillColor(primaryColor).text(metaLine2.join("   "));
        doc.moveDown(0.3);
      }

      if ((recipe as any).description) {
        doc.font("Regular").fontSize(11).fillColor(mutedColor).text((recipe as any).description);
        doc.moveDown(0.5);
      }

      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.5);

      if (imgBuffer) {
        try {
          const thumbW = 120;
          const thumbH = 90;
          const thumbX = 50 + pageWidth - thumbW;
          doc.image(imgBuffer, thumbX, doc.y, { width: thumbW, height: thumbH, cover: [thumbW, thumbH] });
        } catch (e) {
          console.warn("[PDF Export] Image embed error:", e);
        }
      }

      const colGap = 20;
      const col1W = Math.floor(pageWidth * 0.38);
      const col2W = pageWidth - col1W - colGap;
      const col1X = 50;
      const col2X = col1X + col1W + colGap;
      const startY = doc.y;

      doc.font("Bold").fontSize(13).fillColor(textColor).text("食材", col1X, startY, { width: col1W });
      doc.moveDown(0.4);
      let ingY = doc.y;
      for (const ing of ingredientRows) {
        const parts = [ing.amount ? String(ing.amount) : "", ing.unit || "", ing.name || ""].filter(Boolean);
        doc.font("Regular").fontSize(10).fillColor(textColor).text(parts.join(" "), col1X, ingY, { width: col1W });
        ingY += 18;
        if (ingY > doc.page.height - 80) { doc.addPage(); ingY = 50; }
      }
      const col1EndY = ingY;

      doc.font("Bold").fontSize(13).fillColor(textColor).text("步骤", col2X, startY, { width: col2W });
      let stepY = startY + 22;
      const sortedSteps = [...stepRows].sort((a, b) => a.number - b.number);
      for (const step of sortedSteps) {
        const circleR = 9;
        const circleX = col2X + circleR;
        doc.circle(circleX, stepY + circleR, circleR).fillColor(primaryColor).fill();
        doc.font("Bold").fontSize(9).fillColor("#ffffff").text(String(step.number), col2X, stepY + 2, { width: circleR * 2, align: "center" });
        const textX = col2X + circleR * 2 + 6;
        const textW = col2W - circleR * 2 - 6;
        doc.font("Regular").fontSize(10).fillColor(textColor).text(step.description, textX, stepY, { width: textW });
        const textH = doc.heightOfString(step.description, { width: textW });
        stepY += Math.max(textH, circleR * 2) + 10;
        if (stepY > doc.page.height - 80) { doc.addPage(); stepY = 50; }
      }

      doc.y = Math.max(col1EndY, stepY) + 10;

      if ((recipe as any).notes) {
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.font("Bold").fontSize(12).fillColor(textColor).text("备注");
        doc.moveDown(0.3);
        doc.font("Regular").fontSize(10).fillColor(mutedColor).text((recipe as any).notes);
        doc.moveDown(0.5);
      }

      if ((recipe as any).sourceUrl) {
        doc.font("Regular").fontSize(9).fillColor(mutedColor).text(`来源：${(recipe as any).sourceUrl}`, { link: (recipe as any).sourceUrl });
      }

      doc.end();
      const pdfBuffer = await pdfDone;

      const safeTitle = (recipe.title || "recipe").replace(/[^\w\u4e00-\u9fff\u3040-\u30ff\s-]/g, "").trim();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeTitle)}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF Export] Error:", err);
      res.status(500).json({ error: "PDF export failed" });
    } finally {
      for (const f of tmpFiles) {
        try { if (existsSync(f)) unlinkSync(f); } catch {}
      }
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  // Vite in dev, static in prod
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
