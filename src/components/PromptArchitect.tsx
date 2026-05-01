"use client";

import { useState } from "react";
import { Sparkles, User, GitBranch, Zap, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptCard } from "@/components/PromptCard";
import { generateMultiStylePrompts, type GenerateMultiStylePromptsOutput } from "@/ai/flows/generate-multi-style-prompts";
import { useToast } from "@/hooks/use-toast";

export function PromptArchitect() {
  const [rawThought, setRawThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenerateMultiStylePromptsOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!rawThought.trim()) {
      toast({
        title: "Please enter a thought",
        description: "Your raw idea is needed to architect professional prompts.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const output = await generateMultiStylePrompts({ rawThought });
      setResults(output);
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation failed",
        description: "There was an error architecting your prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      {/* Header Section */}
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
          PromptArchitect
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Turn your raw thoughts into high-performance AI instructions. 
          Categorized, structured, and ready to use.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-6 md:p-8 mb-12 transition-all duration-300 focus-within:shadow-md">
        <label htmlFor="raw-thought" className="block text-sm font-medium text-primary mb-3">
          Enter your raw idea or task
        </label>
        <div className="space-y-4">
          <Textarea
            id="raw-thought"
            placeholder="e.g., Write an email about a late project, brainstorm marketing ideas for a new bakery, or explain quantum physics to a child..."
            className="min-h-[120px] text-lg resize-none border-primary/20 focus-visible:ring-primary/30"
            value={rawThought}
            onChange={(e) => setRawThought(e.target.value)}
          />
          <div className="flex justify-end">
            <Button 
              size="lg" 
              onClick={handleGenerate} 
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-6 rounded-lg text-lg transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Architecting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Prompts
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <PromptCard
            title="Persona Approach"
            description="Expert role-play instructions"
            icon={User}
            initialValue={results.personaApproachPrompt}
          />
          <PromptCard
            title="Chain-of-Thought"
            description="Step-by-step reasoning path"
            icon={GitBranch}
            initialValue={results.chainOfThoughtApproachPrompt}
          />
          <PromptCard
            title="Minimalist/Direct"
            description="High-efficiency, focused output"
            icon={Zap}
            initialValue={results.minimalistDirectApproachPrompt}
          />
          <PromptCard
            title="Creative Brainstorm"
            description="Lateral thinking and unique angles"
            icon={Lightbulb}
            initialValue={results.creativeBrainstormingApproachPrompt}
          />
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="text-center py-20 border-2 border-dashed border-primary/10 rounded-2xl bg-secondary/20">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/5 text-primary/40 mb-4">
            <Sparkles className="w-10 h-10" />
          </div>
          <p className="text-muted-foreground font-medium">
            Your architected prompts will appear here
          </p>
        </div>
      )}
    </div>
  );
}
