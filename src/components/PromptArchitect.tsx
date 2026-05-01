
"use client";

import { useState, useMemo } from "react";
import { Sparkles, Loader2, History, LogIn, LogOut, User, GitBranch, Terminal, Megaphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptCard } from "@/components/PromptCard";
import { generateMultiStylePrompts, type GenerateMultiStylePromptsOutput } from "@/ai/flows/generate-multi-style-prompts";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore, useCollection } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PromptArchitect() {
  const [rawThought, setRawThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenerateMultiStylePromptsOutput | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "savedPrompts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: history } = useCollection(historyQuery);

  const handleLogin = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setResults(null);
  };

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
      
      if (user && db) {
        addDoc(collection(db, "savedPrompts"), {
          userId: user.uid,
          rawThought,
          detectedIntent: output.detectedIntent,
          prompts: output.prompts,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation failed",
        description: "There was an error architecting your prompts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (style: string) => {
    switch (style.toLowerCase()) {
      case "persona approach": return User;
      case "chain-of-thought": return GitBranch;
      case "technical/coding": return Terminal;
      case "marketing/sales": return Megaphone;
      default: return Sparkles;
    }
  };

  const handleDeleteHistory = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, "savedPrompts", id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navbar-ish header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">PromptArchitect</h1>
        </div>
        <div className="flex gap-2">
          {user ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Save
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Interface */}
        <div className={cn("space-y-8", showHistory ? "lg:col-span-8" : "lg:col-span-12")}>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <label className="block text-sm font-medium mb-3">Architect your idea</label>
            <div className="space-y-4">
              <Textarea
                placeholder="e.g., Explain React hooks to a 5-year old or write a pitch for a green tech startup..."
                className="min-h-[100px] text-lg"
                value={rawThought}
                onChange={(e) => setRawThought(e.target.value)}
              />
              <div className="flex justify-between items-center">
                {results && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Detected Intent:</span>
                    <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                      {results.detectedIntent}
                    </Badge>
                  </div>
                )}
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="bg-primary text-white ml-auto"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {loading ? "Architecting..." : "Architect Prompts"}
                </Button>
              </div>
            </div>
          </div>

          {results && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.prompts.map((p, idx) => (
                <PromptCard
                  key={idx}
                  title={p.style}
                  description={p.reasoning}
                  icon={getIcon(p.style)}
                  initialValue={p.content}
                  scores={p.scores}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar History */}
        {showHistory && user && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-4 h-4" /> Prompt Library
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  <div className="space-y-4">
                    {history?.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-secondary/10 group relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                          onClick={() => handleDeleteHistory(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <p className="text-xs font-semibold line-clamp-1 mb-1">{item.detectedIntent}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">"{item.rawThought}"</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-[10px]"
                          onClick={() => {
                            setResults({ detectedIntent: item.detectedIntent, prompts: item.prompts });
                            setRawThought(item.rawThought);
                          }}
                        >
                          View Variations
                        </Button>
                      </div>
                    ))}
                    {!history?.length && (
                      <p className="text-center text-sm text-muted-foreground py-10">No saved prompts yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
