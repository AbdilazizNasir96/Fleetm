import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import { logger } from "./logger";
import { verifyToken } from "./auth";

let io: SocketServer | null = null;

export interface LocationPayload {
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  recordedAt: string;
}

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.IO server not initialized");
  return io;
}

export async function initSocketIO(httpServer: HttpServer): Promise<SocketServer> {
  io = new SocketServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  if (process.env["REDIS_URL"]) {
    try {
      const pubClient = new IORedis(process.env["REDIS_URL"]);
      const subClient = pubClient.duplicate();
      await Promise.all([
        new Promise<void>((res, rej) =>
          pubClient.once("ready", res).once("error", rej)
        ),
        new Promise<void>((res, rej) =>
          subClient.once("ready", res).once("error", rej)
        ),
      ]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info("Socket.IO using Redis adapter");
    } catch (err) {
      logger.warn({ err }, "Redis connection failed — Socket.IO falling back to in-memory adapter");
    }
  } else {
    logger.info("REDIS_URL not set — Socket.IO using in-memory adapter");
  }

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth["token"] as string | undefined ||
      (socket.handshake.headers["authorization"] as string | undefined)?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required"));
    }
    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid token"));
    }
    (socket as any).user = payload;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    logger.info({ userId: user.userId, role: user.role }, "Socket connected");

    socket.on("join:trip", (tripId: string) => {
      socket.join(`trip:${tripId}`);
      logger.info({ userId: user.userId, tripId }, "Socket joined trip room");
    });

    socket.on("leave:trip", (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on("location:update", (payload: Omit<LocationPayload, "recordedAt">) => {
      if (user.role !== "driver") {
        socket.emit("error", { message: "Only drivers can emit location updates" });
        return;
      }
      const full: LocationPayload = {
        ...payload,
        recordedAt: new Date().toISOString(),
      };
      socket.to(`trip:${payload.tripId}`).emit("location:update", full);
    });

    socket.on("disconnect", () => {
      logger.info({ userId: user.userId }, "Socket disconnected");
    });
  });

  return io;
}

export function emitTripLocation(payload: LocationPayload): void {
  if (!io) return;
  io.to(`trip:${payload.tripId}`).emit("location:update", payload);
}
