
"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Edit2, Save, LucideIcon, Info, Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PromptCardProps {
  title: string;
  icon: LucideIcon;
  initialValue: string;
  description: string;
  isStarred?: boolean;
  onStarToggle?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  scores: {
    clarity: number;
    clarityReasoning: string;
    specificity: number;
    specificityReasoning: string;
    quality: number;
    qualityReasoning: string;
  };
}

export function PromptCard({ 
  title, 
  icon: Icon, 
  initialValue, 
  description, 
  scores, 
  isStarred, 
  onStarToggle,
  onRegenerate,
  isRegenerating
}: PromptCardProps) {
  const [content, setContent] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-md border-primary/10 bg-white group/card">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-primary">
                {title}
              </CardTitle>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground max-w-[120px] sm:max-w-[150px] truncate">{description}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="cursor-help">
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-xs">
                      {description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 text-muted-foreground hover:text-primary transition-all", isRegenerating && "animate-spin")}
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {onStarToggle && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isStarred ? "text-amber-500 fill-amber-500" : "text-muted-foreground hover:text-amber-500"
                )}
                onClick={onStarToggle}
              >
                <Star className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-colors",
                copied ? "text-green-500" : "text-muted-foreground hover:text-primary"
              )}
              onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 px-4 sm:px-6">
        <div className="relative">
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px] text-xs resize-none focus-visible:ring-primary/30"
              autoFocus
            />
          ) : (
            <div className={cn(
              "text-xs text-foreground leading-relaxed whitespace-pre-wrap p-3 rounded-md bg-secondary/20 min-h-[140px] border border-transparent transition-opacity",
              isRegenerating && "opacity-50"
            )}>
              {content}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <ScoreIndicator label="Clarity" value={scores.clarity} reasoning={scores.clarityReasoning} />
          <ScoreIndicator label="Specificity" value={scores.specificity} reasoning={scores.specificityReasoning} />
          <ScoreIndicator label="Quality" value={scores.quality} reasoning={scores.qualityReasoning} />
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreIndicator({ label, value, reasoning }: { label: string; value: number; reasoning: string }) {
  const getColor = (v: number) => {
    if (v >= 80) return "bg-green-500";
    if (v >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground cursor-help">
              <span>{label}</span>
              <span className="font-bold text-foreground">{value}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px] text-[10px] p-2">
            <p className="font-semibold mb-1">{label} Reasoning:</p>
            {reasoning}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Progress value={value} className="h-1" indicatorClassName={getColor(value)} />
    </div>
  );
}
