
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Sparkles, Loader2, History, LogIn, LogOut, User, GitBranch, 
  Terminal, Megaphone, Trash2, Star, Search, Github, Linkedin, 
  Globe, ExternalLink, Info, ShieldCheck, Zap, BarChart3, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptCard } from "@/components/PromptCard";
import { generateMultiStylePrompts, regenerateStylePrompt } from "@/ai/flows/generate-multi-style-prompts";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore, useCollection, useDoc } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, orderBy, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

export function PromptArchitect() {
  const [rawThought, setRawThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, "userProfiles", user.uid);
  }, [db, user]);

  const { data: profile } = useDoc(userProfileRef);

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    roleTagline: "AI Prompt Engineer",
    bio: "Exploring the boundaries of LLM capabilities.",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: ""
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || user?.displayName || "",
        roleTagline: profile.roleTagline || "AI Prompt Engineer",
        bio: profile.bio || "Exploring the boundaries of LLM capabilities.",
        githubUrl: profile.githubUrl || "",
        linkedinUrl: profile.linkedinUrl || "",
        portfolioUrl: profile.portfolioUrl || ""
      });
    } else if (user) {
      setProfileForm(prev => ({ ...prev, displayName: user.displayName || "" }));
    }
  }, [profile, user]);

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
      toast({ title: "Welcome back!", description: "Profile synchronized." });
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        toast({ title: "Sign in failed", variant: "destructive" });
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
  };

  const handleGenerate = async () => {
    if (!rawThought.trim()) {
      toast({ title: "Please enter a thought", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const output = await generateMultiStylePrompts({ rawThought });
      const promptsWithStar = output.prompts.map(p => ({ ...p, isStarred: false }));
      const newResults = { ...output, prompts: promptsWithStar, rawThought };
      setResults(newResults);
      setActiveDocId(null);
      
      if (user && db) {
        const promptsRef = collection(db, "savedPrompts");
        const data = {
          userId: user.uid,
          rawThought,
          detectedIntent: output.detectedIntent,
          prompts: promptsWithStar,
          createdAt: serverTimestamp(),
        };

        addDoc(promptsRef, data).then(docRef => setActiveDocId(docRef.id));
      }
    } catch (error: any) {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCard = async (idx: number) => {
    if (!results || !results.rawThought) return;
    
    setRegeneratingIdx(idx);
    try {
      const style = results.prompts[idx].style;
      const newPrompt = await regenerateStylePrompt({ rawThought: results.rawThought, style });
      
      const updatedPrompts = [...results.prompts];
      updatedPrompts[idx] = { ...newPrompt, isStarred: false };
      
      const newResults = { ...results, prompts: updatedPrompts };
      setResults(newResults);

      if (activeDocId && db) {
        updateDoc(doc(db, "savedPrompts", activeDocId), { prompts: updatedPrompts });
      }
    } catch (error) {
      toast({ title: "Regeneration failed", variant: "destructive" });
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    setIsEditingProfile(false);
    setDoc(doc(db, "userProfiles", user.uid), { ...profileForm, userId: user.uid });
    toast({ description: "Profile updated." });
  };

  const handleStarToggle = (promptIdx: number) => {
    if (!results || !user || !db) return;
    const updatedPrompts = [...results.prompts];
    updatedPrompts[promptIdx].isStarred = !updatedPrompts[promptIdx].isStarred;
    setResults({ ...results, prompts: updatedPrompts });

    if (activeDocId) {
      updateDoc(doc(db, "savedPrompts", activeDocId), { prompts: updatedPrompts });
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
          {!user ? (
            <Button size="sm" onClick={handleLogin} disabled={signingIn}>
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="w-4 h-4 mr-2" /> {showHistory ? "Hide Library" : "Library"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className={cn("space-y-8 transition-all duration-500", showHistory ? "lg:col-span-8" : "lg:col-span-12")}>
          <Card className="shadow-lg border-none bg-white overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <CardTitle className="text-lg font-medium">Draft your raw thought</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="Describe your goal... e.g., A blog post about future space travel or a bug fix report for an API."
                className="min-h-[120px] text-lg border-primary/10 focus-visible:ring-primary/20 bg-secondary/5"
                value={rawThought}
                onChange={(e) => setRawThought(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {results?.detectedIntent && (
                  <div className="flex items-center gap-3 bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Detected Intent:</span>
                    <span className="text-sm font-medium">{results.detectedIntent}</span>
                  </div>
                )}
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white ml-auto h-12 px-8 rounded-full shadow-md active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  {loading ? "Designing..." : "Architect Variations"}
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
                  onRegenerate={() => handleRegenerateCard(idx)}
                  isRegenerating={regeneratingIdx === idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        {showHistory && user && (
          <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-right duration-500">
            {/* Developer Card */}
            <Card className="shadow-xl border-none overflow-hidden relative group/dev">
              <div className="absolute top-2 right-2 opacity-0 group-hover/dev:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                  {isEditingProfile ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </Button>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback>{profileForm.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    {isEditingProfile ? (
                      <Input 
                        value={profileForm.displayName} 
                        onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} 
                        className="h-7 text-sm mb-1"
                      />
                    ) : (
                      <CardTitle className="text-lg font-bold">{profileForm.displayName}</CardTitle>
                    )}
                    {isEditingProfile ? (
                      <Input 
                        value={profileForm.roleTagline} 
                        onChange={e => setProfileForm({...profileForm, roleTagline: e.target.value})} 
                        className="h-7 text-xs"
                      />
                    ) : (
                      <p className="text-xs text-primary font-semibold">{profileForm.roleTagline}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <Textarea 
                    value={profileForm.bio} 
                    onChange={e => setProfileForm({...profileForm, bio: e.target.value})} 
                    className="text-xs min-h-[60px]"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">"{profileForm.bio}"</p>
                )}
                <div className="flex gap-2">
                  <SocialLink icon={Github} href={profileForm.githubUrl} editMode={isEditingProfile} value={profileForm.githubUrl} onChange={v => setProfileForm({...profileForm, githubUrl: v})} />
                  <SocialLink icon={Linkedin} href={profileForm.linkedinUrl} editMode={isEditingProfile} value={profileForm.linkedinUrl} onChange={v => setProfileForm({...profileForm, linkedinUrl: v})} />
                  <SocialLink icon={Globe} href={profileForm.portfolioUrl} editMode={isEditingProfile} value={profileForm.portfolioUrl} onChange={v => setProfileForm({...profileForm, portfolioUrl: v})} />
                </div>
                {isEditingProfile && <Button size="sm" className="w-full h-8" onClick={handleSaveProfile}>Save Profile</Button>}
              </CardContent>
            </Card>

            {/* App Overview Card */}
            <Card className="shadow-xl border-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> App Overview
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">v1.2.0-Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Architect high-performance AI prompts using persona-based design and scoring.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <StatItem icon={Zap} label="Styles" value="4 Core" />
                  <StatItem icon={BarChart3} label="Metrics" value="Clarity+" />
                  <StatItem icon={Clock} label="Latency" value="~2.4s" />
                  <StatItem icon={ShieldCheck} label="Tier" value="Spark" />
                </div>
              </CardContent>
            </Card>

            {/* Prompt Library */}
            <Card className="shadow-xl border-none flex-1 flex flex-col min-h-[300px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Prompt Library
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border-none text-[10px]">{filteredHistory.length}</Badge>
                </div>
                <div className="relative pt-3">
                  <Search className="absolute left-3 top-6 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Search library..." className="pl-8 h-8 text-[11px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                  <TabsList className="grid grid-cols-2 h-7">
                    <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
                    <TabsTrigger value="starred" className="text-[10px]"><Star className="w-2.5 h-2.5 mr-1 fill-amber-500 text-amber-500" /> Starred</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden flex-1">
                <ScrollArea className="h-[250px] px-4 pb-4">
                  <div className="space-y-2">
                    {filteredHistory.map(item => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-3 border rounded-lg bg-secondary/5 group relative hover:border-primary/20 transition-all cursor-pointer",
                          activeDocId === item.id && "border-primary/40 bg-primary/5"
                        )}
                        onClick={() => {
                          setResults({ rawThought: item.rawThought, detectedIntent: item.detectedIntent, prompts: item.prompts });
                          setActiveDocId(item.id);
                          setRawThought(item.rawThought);
                        }}
                      >
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db!, "savedPrompts", item.id)); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <div className="flex items-center gap-1 mb-1">
                          {item.prompts.some((p: any) => p.isStarred) && <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                          <p className="text-[10px] font-bold line-clamp-1">{item.detectedIntent}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground line-clamp-1 italic">"{item.rawThought}"</p>
                      </div>
                    ))}
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

function SocialLink({ icon: Icon, href, editMode, value, onChange }: { icon: any; href: string; editMode: boolean; value: string; onChange: (v: string) => void }) {
  if (editMode) return <Input value={value} onChange={e => onChange(e.target.value)} className="h-7 text-[10px]" placeholder="URL" />;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
      <Icon className="w-3.5 h-3.5" />
    </a>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-black/5">
      <Icon className="w-3 h-3 text-primary/70" />
      <div>
        <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <p className="text-[10px] font-bold">{value}</p>
      </div>
    </div>
  );
}
