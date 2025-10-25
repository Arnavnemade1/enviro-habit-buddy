import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface EnviroAISummaryProps {
  summary?: string;
  loading?: boolean;
}

export const EnviroAISummary = ({ summary, loading }: EnviroAISummaryProps) => {
  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="font-semibold text-foreground">EnviroAI is analyzing...</p>
            <p className="text-sm text-muted-foreground">Generating your personalized summary</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            EnviroAI Summary
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {summary}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-3 italic">
            Powered by LLaMA 4 Maverick
          </p>
        </div>
      </div>
    </Card>
  );
};
