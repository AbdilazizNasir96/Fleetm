import { pgTable, text, uuid, primaryKey } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { students } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  phone: text("phone"),
});

export const studentParents = pgTable("student_parents", {
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  parentId: uuid("parent_id").references(() => parents.id, { onDelete: "cascade" }).notNull(),
}, (t) => [primaryKey({ columns: [t.studentId, t.parentId] })]);

export const insertParentSchema = createInsertSchema(parents).omit({ id: true });
export type InsertParent = z.infer<typeof insertParentSchema>;
export type Parent = typeof parents.$inferSelect;
