import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { routes } from "./routes";
import { vehicles } from "./vehicles";
import { drivers } from "./drivers";
import { students } from "./students";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  routeId: uuid("route_id").references(() => routes.id).notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id).notNull(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  status: text("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tripPassengers = pgTable("trip_passengers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => students.id),
  boardedAt: timestamp("boarded_at", { withTimezone: true }),
  alightedAt: timestamp("alighted_at", { withTimezone: true }),
  notes: text("notes"),
});

export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type TripPassenger = typeof tripPassengers.$inferSelect;
