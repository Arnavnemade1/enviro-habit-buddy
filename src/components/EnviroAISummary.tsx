import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface EnviroAISummaryProps {
  summary?: string;
  loading?: boolean;
}

export const EnviroAISummary = ({ summary, loading }: EnviroAISummaryProps) => {
  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="absolute inset-0 w-8 h-8 bg-primary/20 rounded-full animate-ping" />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground">EnviroAI is analyzing...</p>
            <p className="text-sm text-muted-foreground">Powered by LLaMA 3.3</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
            EnviroAI Summary
          </h3>
          <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
            {summary}
          </p>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs text-muted-foreground font-medium">
              Powered by LLaMA 3.3
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
