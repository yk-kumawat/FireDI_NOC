import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { fromPath } from "pdf2pic";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import {
  TextExtractionStatus,
  TextExtractionMethod,
  type IExtractedPage,
  type ITextExtractionResult,
} from "../models/Document.js";

// Configure pdf.js worker
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
  __dirname,
  "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
);

export interface TextExtractionConfig {
  maxPages: number;
  maxImageDimension: number;
  ocrLanguage: string;
  processingTimeoutMs: number;
  minEmbeddedTextLength: number;
  maxTotalTextSize: number;
}

export type ExtractedPage = IExtractedPage;
export type TextExtractionResult = ITextExtractionResult;

export class TextExtractionError extends Error {
  category: string;
  statusCode: number;

  constructor(message: string, category: string, statusCode = 500) {
    super(message);
    this.name = "TextExtractionError";
    this.category = category;
    this.statusCode = statusCode;
  }
}

// Default configuration
const DEFAULT_CONFIG: TextExtractionConfig = {
  maxPages: 50,
  maxImageDimension: 3000,
  ocrLanguage: "eng",
  processingTimeoutMs: 5 * 60 * 1000, // 5 minutes
  minEmbeddedTextLength: 50, // Minimum chars to consider embedded text sufficient
  maxTotalTextSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Text Extraction Service
 * Handles PDF text extraction (embedded + OCR) and image OCR
 */
export class TextExtractionService {
  private config: TextExtractionConfig;
  private ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

  constructor(config: Partial<TextExtractionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize OCR worker
   */
  async initializeOcr(): Promise<void> {
    if (this.ocrWorker) return;

    try {
      this.ocrWorker = await createWorker(this.config.ocrLanguage, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            console.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      // Set PSM to auto for better layout analysis
      await this.ocrWorker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });
    } catch (error) {
      throw new TextExtractionError(
        `Failed to initialize OCR worker: ${error}`,
        "OCR_INIT_FAILED"
      );
    }
  }

  /**
   * Terminate OCR worker
   */
  async terminateOcr(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  /**
   * Download file from Cloudinary using signed URL
   */
  async downloadFromCloudinary(
    publicId: string,
    resourceType: "raw" | "image",
    deliveryType: string,
    expiresIn = 3600
  ): Promise<Buffer> {
    const type = deliveryType === "private" ? "private" : "authenticated";
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    });

    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new TextExtractionError(
        `Failed to download file from Cloudinary: ${response.statusText}`,
        "DOWNLOAD_FAILED",
        502
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Validate PDF and get page count
   */
  async validateAndGetPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
      const pdfDoc = await loadingTask.promise;
      return pdfDoc.numPages;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Password")) {
        throw new TextExtractionError(
          "PDF is encrypted and cannot be processed",
          "ENCRYPTED_PDF",
          422
        );
      }
      throw new TextExtractionError(
        `Invalid or corrupted PDF: ${error}`,
        "INVALID_PDF",
        422
      );
    }
  }

  /**
   * Extract embedded text from PDF
   */
  async extractEmbeddedText(
    pdfBuffer: Buffer,
    maxPages: number
  ): Promise<ExtractedPage[]> {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages, maxPages);
    const pages: ExtractedPage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .filter((item) => {
            return (
              typeof item === "object" &&
              item !== null &&
              "str" in item &&
              typeof (item as { str: unknown }).str === "string"
            );
          })
          .map((item) => (item as { str: string }).str)
          .join(" ");

        pages.push({
          pageNumber: pageNum,
          text: this.normalizeText(text),
          method: TextExtractionMethod.EMBEDDED,
        });
      } catch (error) {
        pages.push({
          pageNumber: pageNum,
          text: "",
          method: TextExtractionMethod.EMBEDDED,
          error: `Failed to extract embedded text: ${error}`,
        });
      }
    }

    return pages;
  }

  /**
   * Render PDF pages to images for OCR
   */
  async renderPdfToImages(
    pdfBuffer: Buffer,
    maxPages: number,
    outputDir: string
  ): Promise<string[]> {
    const options = {
      density: 300,
      saveFilename: "page",
      savePath: outputDir,
      format: "png",
      width: this.config.maxImageDimension,
      height: this.config.maxImageDimension,
    };

    const converter = fromPath(
      // pdf2pic expects a file path, so we need to write the buffer to a temp file
      await this.writeTempFile(pdfBuffer, ".pdf"),
      options
    );

    const numPages = Math.min(maxPages, this.config.maxPages);
    const imagePaths: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const result = await converter(pageNum, { responseType: "image" });
        if (result.path) {
          imagePaths.push(result.path);
        }
      } catch (error) {
        console.error(`Failed to render page ${pageNum}:`, error);
        // Continue with other pages
      }
    }

    return imagePaths;
  }

  /**
   * Write buffer to temp file and return path
   */
  private async writeTempFile(buffer: Buffer, extension: string): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "text-extraction-"));
    const tempPath = path.join(tempDir, `input${extension}`);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }

  /**
   * Perform OCR on image
   */
  async performOcr(imagePath: string): Promise<{ text: string; confidence: number }> {
    await this.initializeOcr();

    if (!this.ocrWorker) {
      throw new TextExtractionError("OCR worker not initialized", "OCR_NOT_READY");
    }

    try {
      const result = await this.ocrWorker.recognize(imagePath);
      return {
        text: this.normalizeText(result.data.text),
        confidence: result.data.confidence,
      };
    } catch (error) {
      throw new TextExtractionError(
        `OCR failed: ${error}`,
        "OCR_FAILED"
      );
    }
  }

  /**
   * Check if embedded text is sufficient
   */
  private isEmbeddedTextSufficient(pages: ExtractedPage[]): boolean {
    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
    const nonEmptyPages = pages.filter((p) => p.text.trim().length > 0).length;

    return (
      totalChars >= this.config.minEmbeddedTextLength &&
      nonEmptyPages >= Math.max(1, pages.length * 0.3)
    );
  }

  /**
   * Normalize extracted text
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  /**
   * Calculate total text size
   */
  private calculateTextSize(pages: ExtractedPage[]): number {
    return Buffer.byteLength(pages.map((p) => p.text).join(""), "utf8");
  }

  /**
   * Determine overall extraction method
   */
  private determineMethod(pages: ExtractedPage[]): TextExtractionMethod {
    const methods = pages.map((p) => p.method);
    if (methods.every((m) => m === TextExtractionMethod.EMBEDDED))
      return TextExtractionMethod.EMBEDDED;
    if (methods.every((m) => m === TextExtractionMethod.OCR))
      return TextExtractionMethod.OCR;
    return TextExtractionMethod.MIXED;
  }

  /**
   * Main extraction pipeline
   */
  async extractText(
    publicId: string,
    resourceType: "raw" | "image",
    deliveryType: string,
    mimeType: string
  ): Promise<TextExtractionResult> {
    const startedAt = new Date();
    const tempDirs: string[] = [];

    try {
      // 1. Download file from Cloudinary
      const fileBuffer = await this.downloadFromCloudinary(
        publicId,
        resourceType,
        deliveryType
      );

      // Validate file size
      if (fileBuffer.length > this.config.maxTotalTextSize) {
        throw new TextExtractionError(
          "File too large for text extraction",
          "FILE_TOO_LARGE",
          413
        );
      }

      // 2. Process based on mime type
      let pages: ExtractedPage[] = [];

      if (mimeType === "application/pdf") {
        // PDF processing
        const pageCount = await this.validateAndGetPageCount(fileBuffer);
        const effectiveMaxPages = Math.min(pageCount, this.config.maxPages);

        // Extract embedded text first
        pages = await this.extractEmbeddedText(fileBuffer, effectiveMaxPages);

        // Check if embedded text is sufficient
        const hasSufficientEmbeddedText = this.isEmbeddedTextSufficient(pages);

        if (!hasSufficientEmbeddedText) {
          // Need OCR - render PDF to images
          const tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "pdf-ocr-")
          );
          tempDirs.push(tempDir);

          try {
            const imagePaths = await this.renderPdfToImages(
              fileBuffer,
              effectiveMaxPages,
              tempDir
            );

            // OCR each page
            for (let i = 0; i < imagePaths.length; i++) {
              const pageNum = i + 1;
              try {
                const { text, confidence } = await this.performOcr(imagePaths[i]);
                // Replace or supplement embedded text
                if (pages[pageNum - 1]) {
                  pages[pageNum - 1] = {
                    ...pages[pageNum - 1],
                    text: pages[pageNum - 1].text || text,
                    method: pages[pageNum - 1].text
                      ? TextExtractionMethod.MIXED
                      : TextExtractionMethod.OCR,
                    confidence,
                  };
                } else {
                  pages.push({
                    pageNumber: pageNum,
                    text,
                    method: TextExtractionMethod.OCR,
                    confidence,
                  });
                }
              } catch (error) {
                // Page failed - record error but continue
                if (pages[pageNum - 1]) {
                  pages[pageNum - 1].error = `OCR failed: ${error}`;
                } else {
                  pages.push({
                    pageNumber: pageNum,
                    text: "",
                    method: TextExtractionMethod.OCR,
                    error: `OCR failed: ${error}`,
                  });
                }
              }
            }
          } finally {
            // Cleanup temp dir
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      } else if (
        mimeType === "image/jpeg" ||
        mimeType === "image/jpg" ||
        mimeType === "image/png"
      ) {
        // Image OCR
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-ocr-"));
        tempDirs.push(tempDir);

        try {
          const ext = mimeType === "image/png" ? ".png" : ".jpg";
          const imagePath = path.join(tempDir, `input${ext}`);
          fs.writeFileSync(imagePath, fileBuffer);

          const { text, confidence } = await this.performOcr(imagePath);
          pages = [
            {
              pageNumber: 1,
              text,
              method: TextExtractionMethod.OCR,
              confidence,
            },
          ];
        } finally {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {
            // Ignore cleanup errors
          }
        }
      } else {
        throw new TextExtractionError(
          `Unsupported mime type for text extraction: ${mimeType}`,
          "UNSUPPORTED_TYPE",
          422
        );
      }

      // 3. Build result
      const completedAt = new Date();
      const processedPages = pages.filter(
        (p) => p.text.trim().length > 0 || !p.error
      ).length;
      const method = this.determineMethod(pages);
      const textSize = this.calculateTextSize(pages);

      let status: TextExtractionStatus = TextExtractionStatus.COMPLETED;
      let error: string | undefined;
      let errorCategory: string | undefined;

      if (pages.some((p) => p.error)) {
        status = TextExtractionStatus.PARTIAL;
      }
      if (processedPages === 0 || pages.every((p) => p.error)) {
        status = TextExtractionStatus.FAILED;
        error = pages[0]?.error || "All pages failed to process";
        errorCategory = "ALL_PAGES_FAILED";
      }

      return {
        status,
        method,
        pages,
        totalPages: pages.length,
        processedPages,
        language: this.config.ocrLanguage,
        startedAt,
        completedAt,
        error,
        errorCategory,
        textSize,
      };
    } catch (error) {
      if (error instanceof TextExtractionError) {
        throw error;
      }
      throw new TextExtractionError(
        `Text extraction failed: ${error}`,
        "EXTRACTION_FAILED"
      );
    } finally {
      // Cleanup temp directories
      for (const dir of tempDirs) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
      // Terminate OCR worker
      await this.terminateOcr();
    }
  }
}

// Singleton instance
let textExtractionServiceInstance: TextExtractionService | null = null;

export function getTextExtractionService(
  config?: Partial<TextExtractionConfig>
): TextExtractionService {
  if (!textExtractionServiceInstance) {
    textExtractionServiceInstance = new TextExtractionService(config);
  }
  return textExtractionServiceInstance;
}