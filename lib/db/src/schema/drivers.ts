import { pgTable, text, date, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { vehicles } from "./vehicles";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  licenseNumber: text("license_number").notNull(),
  phone: text("phone"),
  hireDate: date("hire_date"),
  assignedVehicleId: uuid("assigned_vehicle_id").references(() => vehicles.id),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;
