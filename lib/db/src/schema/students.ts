import { pgTable, text, integer, time, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { stops } from "./stops";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  schoolName: text("school_name"),
  grade: integer("grade"),
  homeStopId: uuid("home_stop_id").references(() => stops.id),
  boardingTime: time("boarding_time"),
  alightingTime: time("alighting_time"),
  emergencyContact: text("emergency_contact"),
  specialNeeds: text("special_needs"),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
