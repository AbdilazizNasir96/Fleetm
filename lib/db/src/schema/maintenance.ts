import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { vehicles } from "./vehicles";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id).notNull(),
  maintenanceType: text("maintenance_type"),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
  costCents: integer("cost_cents"),
  notes: text("notes"),
});

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({ id: true });
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
