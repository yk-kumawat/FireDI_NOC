import express from "express";
import authRoutes from "./routes/authRoutes.js";
import applicantRoutes from "./routes/applicantRoutes.js";
import inspectorRoutes from "./routes/inspectorRoutes.js";
import inspectorReviewRoutes from "./routes/inspectorReviewRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import validationRoutes from "./routes/validationRoutes.js";

const app = express();

// Security middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// CORS configuration (kept local so this file does not depend on the cors package)
app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
  if (req.headers.origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type,Authorization"
    );
    res.sendStatus(204);
    return;
  }

  next();
});

// Logging middleware
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Fire Department Inspection & NoC Management Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/applicant", applicantRoutes);
app.use("/api/inspector", inspectorRoutes);
app.use("/api/inspector", inspectorReviewRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/applications", documentRoutes);
app.use("/api/applications", validationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;