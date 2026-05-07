import { pgTable, text, boolean, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { trips } from "./trips";
import { vehicles } from "./vehicles";
import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  tripId: uuid("trip_id").references(() => trips.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  reportedBy: uuid("reported_by").references(() => users.id),
  incidentType: text("incident_type").notNull(),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes"),
  mediaUrls: text("media_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
