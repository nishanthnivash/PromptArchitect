"use client";

import { useState } from "react";
import { Copy, Check, Edit2, Save, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptCardProps {
  title: string;
  icon: LucideIcon;
  initialValue: string;
  description: string;
}

export function PromptCard({ title, icon: Icon, initialValue, description }: PromptCardProps) {
  const [content, setContent] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-md border-primary/10 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-headline font-semibold text-primary">
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Save changes" : "Edit prompt"}
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
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[160px] text-sm resize-none focus-visible:ring-primary/30 border-primary/20 bg-white"
            autoFocus
          />
        ) : (
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap p-3 rounded-md bg-secondary/30 min-h-[160px] border border-transparent">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
