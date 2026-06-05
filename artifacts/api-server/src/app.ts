import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";
import { uploadDir, storageDriver } from "./lib/upload";

const app: Express = express();

// Simple logging middleware (replaces pino-http)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
      : [
          "https://digivant-solutions-app.vercel.app",
          "http://localhost:5173",
          "http://localhost:5175",
        ],
    credentials: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (storageDriver === "local") {
  app.use("/api/uploads", express.static(uploadDir));
}

app.use("/api", router);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
