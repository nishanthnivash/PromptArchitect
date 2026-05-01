
"use client";

import { useState, useMemo, useEffect } from "react";
import { Sparkles, Loader2, History, LogIn, LogOut, User, GitBranch, Terminal, Megaphone, Trash2, Star, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptCard } from "@/components/PromptCard";
import { generateMultiStylePrompts, type GenerateMultiStylePromptsOutput } from "@/ai/flows/generate-multi-style-prompts";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore, useCollection } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function PromptArchitect() {
  const [rawThought, setRawThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
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

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    let items = history;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.detectedIntent.toLowerCase().includes(q) || 
        item.rawThought.toLowerCase().includes(q)
      );
    }

    if (activeTab === "starred") {
      items = items.filter(item => item.prompts.some((p: any) => p.isStarred));
    }

    return items;
  }, [history, searchQuery, activeTab]);

  const handleLogin = async () => {
    if (!auth || signingIn) return;
    setSigningIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast({
        title: "Welcome!",
        description: "You are now signed in. Your prompts will be saved automatically.",
      });
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        toast({
          title: "Sign in failed",
          description: "Could not sign in with Google.",
          variant: "destructive",
        });
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setResults(null);
    setActiveDocId(null);
    toast({
      description: "Signed out successfully.",
    });
  };

  const handleGenerate = async () => {
    if (!rawThought.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter a thought to architect professional prompts.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const output = await generateMultiStylePrompts({ rawThought });
      
      const promptsWithStar = output.prompts.map(p => ({ ...p, isStarred: false }));
      const newResults = { ...output, prompts: promptsWithStar };
      setResults(newResults);
      setActiveDocId(null); // Reset active doc until it's saved
      
      if (user && db) {
        const promptsRef = collection(db, "savedPrompts");
        const data = {
          userId: user.uid,
          rawThought,
          detectedIntent: output.detectedIntent,
          prompts: promptsWithStar,
          createdAt: serverTimestamp(),
        };

        addDoc(promptsRef, data)
          .then((docRef) => {
            setActiveDocId(docRef.id);
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: promptsRef.path,
              operation: 'create',
              requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: "There was an error architecting your prompts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStarToggle = (promptIdx: number) => {
    if (!results || !user || !db) return;

    // Local update first for immediate UI feedback
    const updatedPrompts = [...results.prompts];
    updatedPrompts[promptIdx].isStarred = !updatedPrompts[promptIdx].isStarred;
    setResults({ ...results, prompts: updatedPrompts });

    // Update Firestore if we have an active doc ID
    if (activeDocId) {
      const docRef = doc(db, "savedPrompts", activeDocId);
      updateDoc(docRef, { prompts: updatedPrompts }).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { prompts: updatedPrompts },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    } else {
      // If we don't have an ID, maybe try finding it in history (edge case)
      const currentDoc = history?.find(h => h.rawThought === results.rawThought && h.detectedIntent === results.detectedIntent);
      if (currentDoc) {
        setActiveDocId(currentDoc.id);
        const docRef = doc(db, "savedPrompts", currentDoc.id);
        updateDoc(docRef, { prompts: updatedPrompts }).catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { prompts: updatedPrompts },
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }
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

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;
    const docRef = doc(db, "savedPrompts", id);
    deleteDoc(docRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">PromptArchitect</h1>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/5 text-primary">
                  {user.displayName?.[0] || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold">{user.displayName}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="w-4 h-4 mr-2" />
                Library
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleLogin} disabled={signingIn}>
              {signingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              Sign In
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={cn("space-y-8 transition-all duration-300", showHistory ? "lg:col-span-8" : "lg:col-span-12")}>
          <Card className="shadow-lg border-none bg-white overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <CardTitle className="text-lg font-medium">Input your raw thought</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="e.g., Explain React hooks to a 5-year old or write a pitch for a green tech startup..."
                className="min-h-[120px] text-lg border-primary/10 focus-visible:ring-primary/20 bg-secondary/5"
                value={rawThought}
                onChange={(e) => setRawThought(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {results && (
                  <div className="flex items-center gap-3 bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10 animate-fade-in">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Intent:</span>
                    <span className="text-sm font-medium text-foreground">
                      {results.detectedIntent}
                    </span>
                  </div>
                )}
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white ml-auto h-12 px-8 rounded-full shadow-md transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  {loading ? "Architecting..." : "Architect Prompts"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {results && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {results.prompts.map((p: any, idx: number) => (
                <PromptCard
                  key={idx}
                  title={p.style}
                  description={p.reasoning}
                  icon={getIcon(p.style)}
                  initialValue={p.content}
                  scores={p.scores}
                  isStarred={p.isStarred}
                  onStarToggle={() => handleStarToggle(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {showHistory && user && (
          <div className="lg:col-span-4 space-y-4 animate-in slide-in-from-right duration-300">
            <Card className="h-[calc(100vh-160px)] shadow-xl border-none flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" /> Prompt Library
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                    {filteredHistory.length}
                  </Badge>
                </CardTitle>
                <div className="relative pt-2">
                  <Search className="absolute left-3 top-5 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search library..." 
                    className="pl-9 h-9 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mt-2">
                    <TabsTrigger value="all" className="text-[10px] h-7">All</TabsTrigger>
                    <TabsTrigger value="starred" className="text-[10px] h-7 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Starred
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full px-4 pb-4">
                  <div className="space-y-3">
                    {filteredHistory?.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 border rounded-xl bg-secondary/5 group relative hover:border-primary/20 transition-all cursor-pointer",
                          activeDocId === item.id && "border-primary/40 bg-primary/5 shadow-sm"
                        )}
                        onClick={() => {
                          setResults({ 
                            rawThought: item.rawThought, 
                            detectedIntent: item.detectedIntent, 
                            prompts: item.prompts 
                          });
                          setActiveDocId(item.id);
                          setRawThought(item.rawThought);
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-7 w-7 text-destructive hover:bg-destructive/10 transition-opacity"
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <div className="flex gap-1.5 mb-2">
                          {item.prompts.some((p: any) => p.isStarred) && (
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          )}
                          <p className="text-xs font-bold line-clamp-1">{item.detectedIntent}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 italic bg-white/50 p-2 rounded border border-black/5">
                          "{item.rawThought}"
                        </p>
                      </div>
                    ))}
                    {!filteredHistory?.length && (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                        <Search className="w-8 h-8 mb-3" />
                        <p className="text-xs">No matching prompts found.</p>
                      </div>
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
