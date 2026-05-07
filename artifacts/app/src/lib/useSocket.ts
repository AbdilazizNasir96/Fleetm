import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "./api";

export interface LocationUpdate {
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  recordedAt: string;
}

export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

const SOCKET_PATH = "/api/socket.io";

let sharedSocket: Socket | null = null;
let socketRefCount = 0;

function getOrCreateSocket(token: string): Socket {
  if (!sharedSocket || !sharedSocket.connected) {
    sharedSocket?.disconnect();
    sharedSocket = io("/", {
      path: SOCKET_PATH,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return sharedSocket;
}

export function useSocket(): { socket: Socket | null; status: SocketStatus } {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    socketRefCount++;
    const socket = getOrCreateSocket(token);
    socketRef.current = socket;

    setStatus(socket.connected ? "connected" : "connecting");

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socketRefCount--;
      if (socketRefCount <= 0) {
        socket.disconnect();
        sharedSocket = null;
        socketRefCount = 0;
      }
    };
  }, []);

  return { socket: socketRef.current, status };
}

export function useTripLocation(tripId: string | null) {
  const [location, setLocation] = useState<LocationUpdate | null>(null);
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const token = getAuthToken();
    if (!token) return;

    socketRefCount++;
    const socket = getOrCreateSocket(token);
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("join:trip", tripId);
      setStatus("connected");
    };

    const onLocation = (payload: LocationUpdate) => {
      if (payload.tripId === tripId) setLocation(payload);
    };

    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    if (socket.connected) {
      joinRoom();
    } else {
      setStatus("connecting");
      socket.connect();
    }

    socket.on("connect", joinRoom);
    socket.on("location:update", onLocation);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.emit("leave:trip", tripId);
      socket.off("connect", joinRoom);
      socket.off("location:update", onLocation);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socketRefCount--;
      if (socketRefCount <= 0) {
        socket.disconnect();
        sharedSocket = null;
        socketRefCount = 0;
      }
    };
  }, [tripId]);

  const emitLocation = useCallback(
    (payload: Omit<LocationUpdate, "tripId" | "recordedAt">) => {
      if (!tripId || !socketRef.current?.connected) return;
      socketRef.current.emit("location:update", { ...payload, tripId });
    },
    [tripId]
  );

  return { location, status, emitLocation };
}
