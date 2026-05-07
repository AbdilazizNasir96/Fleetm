import { pgTable, text, smallint, time, uuid, real } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { routes } from "./routes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stops = pgTable("stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  routeId: uuid("route_id").references(() => routes.id, { onDelete: "cascade" }),
  sequence: smallint("sequence").notNull(),
  name: text("name"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  pickupWindowStart: time("pickup_window_start"),
  pickupWindowEnd: time("pickup_window_end"),
});

export const insertStopSchema = createInsertSchema(stops).omit({ id: true });
export type InsertStop = z.infer<typeof insertStopSchema>;
export type Stop = typeof stops.$inferSelect;
