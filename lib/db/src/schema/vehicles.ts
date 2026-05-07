import { pgTable, text, boolean, timestamp, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  licensePlate: text("license_plate").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status").default("active"),
  lastMaintenanceAt: timestamp("last_maintenance_at", { withTimezone: true }),
  currentOdometer: integer("current_odometer"),
  metadata: jsonb("metadata"),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
