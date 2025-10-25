import { AlertCircle, CheckCircle, Info, Lightbulb, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InsightCardProps {
  insight: {
    id: string;
    insight_type: string;
    title: string;
    message: string;
    priority: string;
    created_at: string;
  };
  onDismiss?: (id: string) => void;
}

export const InsightCard = ({ insight, onDismiss }: InsightCardProps) => {
  const getIcon = () => {
    switch (insight.insight_type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5" />;
      case 'recommendation':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getPriorityColor = () => {
    switch (insight.priority) {
      case 'urgent':
        return 'border-destructive bg-destructive/5';
      case 'high':
        return 'border-accent bg-accent/5';
      case 'medium':
        return 'border-secondary bg-secondary/5';
      default:
        return 'border-muted bg-muted/5';
    }
  };

  const getIconColor = () => {
    switch (insight.priority) {
      case 'urgent':
        return 'text-destructive';
      case 'high':
        return 'text-accent';
      case 'medium':
        return 'text-secondary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={`p-4 ${getPriorityColor()} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${getIconColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {insight.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {new Date(insight.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(insight.id)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};
