import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;
