import { pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";

export const userTenants = pgTable("user_tenants", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.tenantId] })]);

export type UserTenant = typeof userTenants.$inferSelect;
