import { Router } from "express";
import { db } from "@workspace/db";
import { routes, stops } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateRouteBody,
  UpdateRouteBody,
  GetRouteParams,
  UpdateRouteParams,
  DeleteRouteParams,
  ListStopsParams,
  CreateStopParams,
  CreateStopBody,
  UpdateStopParams,
  UpdateStopBody,
  DeleteStopParams,
} from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

// Routes
router.get("/routes", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .select({
      id: routes.id,
      tenantId: routes.tenantId,
      name: routes.name,
      description: routes.description,
      direction: routes.direction,
      isActive: routes.isActive,
      createdAt: routes.createdAt,
    })
    .from(routes)
    .where(eq(routes.tenantId, tenantId));

  const stopCounts = await db
    .select({ routeId: stops.routeId, count: count() })
    .from(stops)
    .groupBy(stops.routeId);

  const stopCountMap = Object.fromEntries(stopCounts.map(s => [s.routeId, s.count]));

  res.json(rows.map(r => ({ ...r, stopCount: stopCountMap[r.id] ?? 0 })));
});

router.post("/routes", async (req, res): Promise<void> => {
  const parsed = CreateRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [route] = await db.insert(routes).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(route);
});

router.get("/routes/:routeId", async (req, res): Promise<void> => {
  const params = GetRouteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [route] = await db.select().from(routes).where(
    and(eq(routes.id, params.data.routeId), eq(routes.tenantId, tenantId))
  );
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  const routeStops = await db.select().from(stops)
    .where(eq(stops.routeId, route.id))
    .orderBy(stops.sequence);
  res.json({ ...route, stops: routeStops });
});

router.patch("/routes/:routeId", async (req, res): Promise<void> => {
  const params = UpdateRouteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [route] = await db.update(routes)
    .set(parsed.data)
    .where(and(eq(routes.id, params.data.routeId), eq(routes.tenantId, tenantId)))
    .returning();
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  res.json(route);
});

router.delete("/routes/:routeId", async (req, res): Promise<void> => {
  const params = DeleteRouteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [route] = await db.delete(routes)
    .where(and(eq(routes.id, params.data.routeId), eq(routes.tenantId, tenantId)))
    .returning();
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  res.sendStatus(204);
});

// Stops
router.get("/routes/:routeId/stops", async (req, res): Promise<void> => {
  const params = ListStopsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const [route] = await db.select({ id: routes.id }).from(routes)
    .where(and(eq(routes.id, params.data.routeId), eq(routes.tenantId, tenantId)));
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  const routeStops = await db.select().from(stops)
    .where(eq(stops.routeId, params.data.routeId))
    .orderBy(stops.sequence);
  res.json(routeStops);
});

router.post("/routes/:routeId/stops", async (req, res): Promise<void> => {
  const params = CreateStopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateStopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const { latitude, longitude, ...rest } = parsed.data;
  const [stop] = await db.insert(stops).values({
    ...rest,
    latitude,
    longitude,
    routeId: params.data.routeId,
    tenantId,
  }).returning();
  res.status(201).json(stop);
});

router.patch("/routes/:routeId/stops/:stopId", async (req, res): Promise<void> => {
  const params = UpdateStopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [stop] = await db.update(stops)
    .set(parsed.data)
    .where(and(eq(stops.id, params.data.stopId), eq(stops.routeId, params.data.routeId)))
    .returning();
  if (!stop) {
    res.status(404).json({ error: "Stop not found" });
    return;
  }
  res.json(stop);
});

router.delete("/routes/:routeId/stops/:stopId", async (req, res): Promise<void> => {
  const params = DeleteStopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [stop] = await db.delete(stops)
    .where(and(eq(stops.id, params.data.stopId), eq(stops.routeId, params.data.routeId)))
    .returning();
  if (!stop) {
    res.status(404).json({ error: "Stop not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
