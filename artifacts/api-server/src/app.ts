import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadDir, storageDriver } from "./lib/upload";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
//Foce redeploy
// 🟢 REPLACE the original `app.use(cors());` with this:
app.use(cors({
  origin: [
    'https://digivant-solutions-app.vercel.app',
    'http://localhost:5175'
  ],
  credentials: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (storageDriver === "local") {
  app.use("/api/uploads", express.static(uploadDir));
}

app.use("/api", router);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err }, "Unhandled error");
  logger.error({ err, url: req.url }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
