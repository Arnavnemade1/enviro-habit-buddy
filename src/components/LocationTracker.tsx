import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Activity } from "lucide-react";

interface LocationTrackerProps {
  userId: string | undefined;
  onLocationUpdate: (location: { latitude: number; longitude: number; locationName: string }) => void;
}

export const LocationTracker = ({ userId, onLocationUpdate }: LocationTrackerProps) => {
  const { toast } = useToast();
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (userId) {
      loadLocationHistory();
    }
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userId]);

  const loadLocationHistory = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('location_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (data) setLocationHistory(data);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    setTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setCurrentLocation(location);

        // Get location name using reverse geocoding (simplified)
        const locationName = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;

        // Store in database if user is logged in
        if (userId) {
          await supabase.from('location_history').insert({
            user_id: userId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            location_name: locationName,
          });

          await loadLocationHistory();
        }

        onLocationUpdate({
          latitude: location.latitude,
          longitude: location.longitude,
          locationName
        });

        toast({
          title: "Location updated",
          description: `Tracking at ${locationName}`,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Location error",
          description: error.message,
          variant: "destructive"
        });
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
    toast({
      title: "Tracking stopped",
      description: "Location tracking has been disabled",
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setCurrentLocation(location);
        const locationName = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;

        onLocationUpdate({
          latitude: location.latitude,
          longitude: location.longitude,
          locationName
        });

        toast({
          title: "Location found",
          description: locationName,
        });
      },
      (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    );
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Location Tracking</h3>
        </div>
        {tracking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="w-3 h-3 animate-pulse text-primary" />
            Active
          </div>
        )}
      </div>

      {currentLocation && (
        <div className="text-sm text-muted-foreground">
          <p>Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</p>
          <p className="text-xs">Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={getCurrentLocation}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Location
        </Button>
        <Button
          onClick={tracking ? stopTracking : startTracking}
          size="sm"
          className="flex-1"
          variant={tracking ? "destructive" : "default"}
        >
          {tracking ? "Stop" : "Start"} Tracking
        </Button>
      </div>

      {locationHistory.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Recent locations:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {locationHistory.slice(0, 5).map((loc) => (
              <div key={loc.id} className="text-xs text-muted-foreground">
                📍 {loc.location_name} • {new Date(loc.timestamp).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
