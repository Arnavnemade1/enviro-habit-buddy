import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wind, Droplets, ThermometerSun } from "lucide-react";

interface TrendData {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  icon: any;
}

interface EnvironmentalTrendsProps {
  trends?: TrendData[];
}

export const EnvironmentalTrends = ({ trends }: EnvironmentalTrendsProps) => {
  const defaultTrends: TrendData[] = trends || [
    { label: 'Air Quality', value: 42, unit: 'AQI', trend: 'down', change: -12, icon: Wind },
    { label: 'Temperature', value: 22, unit: '°C', trend: 'up', change: 3, icon: ThermometerSun },
    { label: 'Humidity', value: 65, unit: '%', trend: 'stable', change: 0, icon: Droplets },
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-orange-600';
      case 'down': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return () => <span className="text-xs">→</span>;
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-foreground mb-4">Environmental Trends</h3>
      <div className="grid grid-cols-3 gap-3">
        {defaultTrends.map((trend, index) => {
          const Icon = trend.icon;
          const TrendIcon = getTrendIcon(trend.trend);
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Icon className="w-3 h-3" />
                <span className="text-xs">{trend.label}</span>
              </div>
              <div className="font-bold text-foreground text-lg">
                {trend.value}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {trend.unit}
                </span>
              </div>
              {trend.change !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(trend.trend)}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{Math.abs(trend.change)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
