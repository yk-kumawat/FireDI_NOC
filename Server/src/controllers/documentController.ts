import { Response, NextFunction } from "express";
import multer from "multer";
import { AuthRequest } from "./authController.js";
import { getDocumentService } from "../services/documentService.js";
import { DocumentServiceError } from "../services/documentService.js";
import { StorageError } from "../services/storageService.js";

// Helper to extract single value from params (handles string | string[])
const getParam = (param: string | string[]): string => (Array.isArray(param) ? param[0] : param);

// Configure multer for memory storage (we'll stream to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, JPG, and PNG are allowed."));
    }
  },
});

// ─── Upload Document ───────────────────────────────────────────────────────────
export const uploadDocument = [
  upload.single("document"),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const applicationId = getParam(req.params.id);
      const requirementId = getParam(req.params.requirementId);

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      const documentService = getDocumentService();
      const document = await documentService.uploadDocument({
        applicationId,
        requirementId,
        applicantId: userId,
        fileBuffer: req.file.buffer,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: {
          document: {
            _id: document._id,
            requirementId: document.requirementId,
            originalFilename: document.originalFilename,
            mimeType: document.mimeType,
            fileSize: document.fileSize,
            version: document.version,
            processingStatus: document.processingStatus,
            verificationStatus: document.verificationStatus,
            uploadedAt: document.uploadedAt,
            createdAt: document.createdAt,
          },
        },
      });
    } catch (error: any) {
      if (error instanceof DocumentServiceError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }
      if (error instanceof StorageError) {
        res.status(500).json({
          success: false,
          message: `Storage error: ${error.message}`,
          code: error.code,
        });
        return;
      }
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            success: false,
            message: "File size exceeds 10MB limit",
            code: "FILE_TOO_LARGE",
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }
      console.error("uploadDocument error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload document",
        error: error.message,
      });
    }
  },
];

// ─── List Documents for Requirement ────────────────────────────────────────────
export const listDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const requirementId = getParam(req.params.requirementId);

    const documentService = getDocumentService();
    const documents = await documentService.listDocuments({
      applicationId,
      requirementId,
      applicantId: userId,
    });

    res.status(200).json({
      success: true,
      data: {
        documents: documents.map((doc) => ({
          _id: doc._id,
          requirementId: doc.requirementId,
          originalFilename: doc.originalFilename,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          version: doc.version,
          processingStatus: doc.processingStatus,
          verificationStatus: doc.verificationStatus,
          uploadedAt: doc.uploadedAt,
          createdAt: doc.createdAt,
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof DocumentServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("listDocuments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list documents",
      error: error.message,
    });
  }
};

// ─── Get Document Metadata ─────────────────────────────────────────────────────
export const getDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const documentService = getDocumentService();
    const document = await documentService.getDocument({
      applicationId,
      documentId,
      applicantId: userId,
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        document: {
          _id: document._id,
          requirementId: document.requirementId,
          originalFilename: document.originalFilename,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          version: document.version,
          processingStatus: document.processingStatus,
          verificationStatus: document.verificationStatus,
          uploadedAt: document.uploadedAt,
          createdAt: document.createdAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof DocumentServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getDocument error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve document",
      error: error.message,
    });
  }
};

// ─── Get Document Download URL ─────────────────────────────────────────────────
export const getDocumentDownloadUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const documentService = getDocumentService();
    const downloadUrl = await documentService.getDocumentDownloadUrl(
      applicationId,
      documentId,
      userId
    );

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600, // 1 hour
      },
    });
  } catch (error: any) {
    if (error instanceof DocumentServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("getDocumentDownloadUrl error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate download URL",
      error: error.message,
    });
  }
};

// ─── Replace Document ──────────────────────────────────────────────────────────
export const replaceDocument = [
  upload.single("document"),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const applicationId = getParam(req.params.id);
      const documentId = getParam(req.params.documentId);

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      const documentService = getDocumentService();
      const document = await documentService.replaceDocument({
        applicationId,
        documentId,
        applicantId: userId,
        fileBuffer: req.file.buffer,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      res.status(200).json({
        success: true,
        message: "Document replaced successfully",
        data: {
          document: {
            _id: document._id,
            requirementId: document.requirementId,
            originalFilename: document.originalFilename,
            mimeType: document.mimeType,
            fileSize: document.fileSize,
            version: document.version,
            processingStatus: document.processingStatus,
            verificationStatus: document.verificationStatus,
            uploadedAt: document.uploadedAt,
            createdAt: document.createdAt,
          },
        },
      });
    } catch (error: any) {
      if (error instanceof DocumentServiceError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }
      if (error instanceof StorageError) {
        res.status(500).json({
          success: false,
          message: `Storage error: ${error.message}`,
          code: error.code,
        });
        return;
      }
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            success: false,
            message: "File size exceeds 10MB limit",
            code: "FILE_TOO_LARGE",
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }
      console.error("replaceDocument error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to replace document",
        error: error.message,
      });
    }
  },
];

// ─── Delete Document ───────────────────────────────────────────────────────────
export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const applicationId = getParam(req.params.id);
    const documentId = getParam(req.params.documentId);

    const documentService = getDocumentService();
    await documentService.deleteDocument(applicationId, documentId, userId);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    if (error instanceof DocumentServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("deleteDocument error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    });
  }
};