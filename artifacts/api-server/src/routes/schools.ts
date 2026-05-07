import { Router } from "express";
import { db } from "@workspace/db";
import { schools } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

const CreateSchoolBody = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
});

const UpdateSchoolBody = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
});

router.get("/schools", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db.select().from(schools).where(eq(schools.tenantId, tenantId));
  res.json(rows);
});

router.post("/schools", async (req, res): Promise<void> => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [school] = await db.insert(schools).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(school);
});

router.patch("/schools/:schoolId", async (req, res): Promise<void> => {
  const { schoolId } = req.params;
  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [school] = await db
    .update(schools)
    .set(parsed.data)
    .where(and(eq(schools.id, schoolId), eq(schools.tenantId, tenantId)))
    .returning();
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.json(school);
});

router.delete("/schools/:schoolId", async (req, res): Promise<void> => {
  const { schoolId } = req.params;
  const tenantId = req.user!.tenantId;
  const [school] = await db
    .delete(schools)
    .where(and(eq(schools.id, schoolId), eq(schools.tenantId, tenantId)))
    .returning();
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
