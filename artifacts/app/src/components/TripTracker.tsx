import { useTripLocation, SocketStatus } from "@/lib/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Wifi, WifiOff, Loader2 } from "lucide-react";

interface TripTrackerProps {
  tripId: string;
  tripName?: string;
}

function StatusIndicator({ status }: { status: SocketStatus }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live
      </div>
    );
  }
  if (status === "connecting") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
        <WifiOff className="w-3 h-3" />
        Connection error
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      <WifiOff className="w-3 h-3" />
      Disconnected
    </div>
  );
}

function HeadingArrow({ heading }: { heading?: number }) {
  if (heading === undefined) return null;
  return (
    <span
      className="inline-block text-primary"
      style={{ transform: `rotate(${heading}deg)`, display: "inline-block" }}
      title={`Heading: ${heading}°`}
    >
      ↑
    </span>
  );
}

export function TripTracker({ tripId, tripName }: TripTrackerProps) {
  const { location, status } = useTripLocation(tripId);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          {tripName ? `Live: ${tripName}` : "Live Tracking"}
        </CardTitle>
        <StatusIndicator status={status} />
      </CardHeader>
      <CardContent>
        {location ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-sm">
                <span className="font-mono text-foreground">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              {location.speedKmh !== undefined && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Speed</p>
                  <p className="text-lg font-bold text-foreground">
                    {location.speedKmh.toFixed(0)}
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">km/h</span>
                  </p>
                </div>
              )}
              {location.heading !== undefined && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Heading</p>
                  <p className="text-lg font-bold text-foreground flex items-center gap-1">
                    <HeadingArrow heading={location.heading} />
                    {location.heading}°
                  </p>
                </div>
              )}
              <div className="text-center ml-auto">
                <p className="text-xs text-muted-foreground">Last update</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(location.recordedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <MapPin className="w-3 h-3" />
              Open in Maps
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Wifi className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">
              {status === "connected"
                ? "Waiting for driver to send location…"
                : "Connect to track this trip in real time"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
