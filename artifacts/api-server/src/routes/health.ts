import { Router } from "express";

const router = Router();

router.get("/public/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
