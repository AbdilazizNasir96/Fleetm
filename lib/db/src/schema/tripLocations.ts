import { pgTable, timestamp, uuid, numeric, smallint, real } from "drizzle-orm/pg-core";
import { trips } from "./trips";

export const tripLocations = pgTable("trip_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speedKmh: numeric("speed_kmh", { precision: 6, scale: 2 }),
  heading: smallint("heading"),
});

export type TripLocation = typeof tripLocations.$inferSelect;
