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
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/10 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                {Math.round(weather.temperature)}°
              </div>
              <p className="text-lg text-muted-foreground capitalize font-medium">
                {weather.description}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-foreground">{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                <Wind className="w-5 h-5 text-cyan-400" />
                <span className="font-medium text-foreground">{weather.windSpeed} km/h</span>
              </div>
            </div>
          </div>

          {airQuality && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between bg-background/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Cloud className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Air Quality</span>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getAQIColor(airQuality.aqi)}`}>
                    {airQuality.aqi}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">
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
