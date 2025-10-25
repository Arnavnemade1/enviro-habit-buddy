import { Cloud, Wind, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardHeaderProps {
  location: string;
  weather?: {
    temperature: number;
    description: string;
    humidity: number;
    windSpeed: number;
  };
  airQuality?: {
    aqi: number;
    pm25: number;
  };
}

export const DashboardHeader = ({ location, weather, airQuality }: DashboardHeaderProps) => {
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-primary";
    if (aqi <= 100) return "text-yellow-600";
    if (aqi <= 150) return "text-orange-600";
    return "text-destructive";
  };

  const getAQILabel = (aqi: number) => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive";
    return "Unhealthy";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">
          EnviroAgent
        </h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {location}
        </p>
      </div>

      {weather && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-5xl font-bold text-foreground mb-2">
                {Math.round(weather.temperature)}°
              </div>
              <p className="text-lg text-muted-foreground capitalize">
                {weather.description}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4" />
                <span>{weather.windSpeed} km/h</span>
              </div>
            </div>
          </div>

          {airQuality && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Air Quality</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getAQIColor(airQuality.aqi)}`}>
                    {airQuality.aqi}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getAQILabel(airQuality.aqi)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
