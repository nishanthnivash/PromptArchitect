"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Sparkles, Loader2, History, LogIn, LogOut, User, GitBranch, 
  Terminal, Megaphone, Trash2, Star, Search, Github, Linkedin, 
  Globe, Info, ShieldCheck, Zap, BarChart3, Clock,
  Save, Edit2, Settings2, PlusCircle, LayoutGrid,
  BookOpen, Coffee, Lightbulb, Mail
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PromptArchitect() {
  const [rawThought, setRawThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const devPortrait = PlaceHolderImages.find(img => img.id === "dev-portrait")?.imageUrl;

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

  const handleNewPrompt = () => {
    setRawThought("");
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
      updatedPrompts[idx] = { ...newPrompt, isStarred: results.prompts[idx].isStarred };
      
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
    setDoc(doc(db, "userProfiles", user.uid), { ...profileForm, userId: user.uid }, { merge: true });
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
      {/* Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-primary/5 sticky top-4 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div onClick={handleNewPrompt} className="cursor-pointer group">
            <h1 className="text-2xl font-headline font-bold text-primary tracking-tight leading-none group-hover:text-primary/80 transition-colors">PromptArchitect</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Prompt Engineering Studio</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <TooltipProvider>
            <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-primary/5">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-xs font-semibold hover:bg-white">
                    <BookOpen className="w-4 h-4 text-primary" /> How it Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                  <DialogHeader className="p-6 bg-primary/5">
                    <DialogTitle className="text-2xl font-bold text-primary">How PromptArchitect works</DialogTitle>
                    <DialogDescription className="text-base font-medium text-foreground/70">
                      From raw thought to four structured, ready-to-use prompts in seconds
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                          <LayoutGrid className="w-5 h-5" /> The 4-step process
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <StepItem number="1" title="Type your raw thought" desc="No need to craft a perfect prompt. Just describe what you need in plain language." />
                          <StepItem number="2" title="AI detects your intent" desc="The engine analyzes your input — identifying your core objective and context." />
                          <StepItem number="3" title="Four prompt styles are generated" desc="Your input is transformed into four distinctly structured prompts, each for a different use case." />
                          <StepItem number="4" title="Review, edit, and copy" desc="Pick the best, tweak it, and copy it straight into any AI tool like ChatGPT or Claude." />
                        </div>
                      </section>
                      <Separator />
                      <section>
                        <h3 className="text-lg font-bold mb-4 text-primary">The 4 prompt styles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <StyleDetail icon={User} title="Persona Approach" desc="Assigns role/expertise. Best for professional, domain-specific tasks." />
                          <StyleDetail icon={GitBranch} title="Chain-of-Thought" desc="Guides AI through reasoning steps. Best for analysis and planning." />
                          <StyleDetail icon={Terminal} title="Technical / Coding" desc="Precise, code-ready output. Best for devs and system design." />
                          <StyleDetail icon={Megaphone} title="Marketing / Sales" desc="Persuasive copy. Best for pitches and audience messaging." />
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-xs font-semibold hover:bg-white">
                    <Coffee className="w-4 h-4 text-primary" /> Meet the Dev
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                  <div className="h-32 bg-gradient-to-r from-primary to-accent w-full" />
                  <div className="px-6 pb-8 text-center">
                    <div className="relative mx-auto -mt-20 mb-4 h-48 w-48 overflow-hidden rounded-2xl border-4 border-white shadow-xl">
                      <img 
                        src={devPortrait} 
                        alt="Developer Portrait"
                        className="h-full w-full object-cover object-top"
                        data-ai-hint="developer portrait"
                      />
                    </div>
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-bold">The Prompt Architect</DialogTitle>
                      <DialogDescription className="text-primary font-semibold text-sm">
                        Full-stack developer building AI-powered productivity tools.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 text-sm text-foreground/80 leading-relaxed text-left bg-secondary/20 p-4 rounded-2xl border border-primary/5">
                      <p>
                        I built PromptArchitect because I kept rewriting the same prompts over and over. This tool is my answer to that — structured, fast, and opinionated.
                      </p>
                      <p className="font-medium text-foreground">
                        Open to feedback, collabs, and freelance projects.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 mt-8">
                      <Button variant="outline" size="sm" className="rounded-full gap-2 px-6" asChild>
                        <a href="mailto:nishanthrocky756@gmail.com">
                          <Mail className="w-4 h-4" /> Email Me
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full gap-2 px-6" asChild>
                        <a href="https://www.linkedin.com/in/nishanth-s-77b4a3264" target="_blank">
                          <Linkedin className="w-4 h-4" /> LinkedIn
                        </a>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {user && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={showHistory ? "secondary" : "ghost"} 
                      size="sm" 
                      className={cn("h-9 px-3 gap-2 text-xs font-semibold", showHistory ? "bg-white shadow-sm" : "")} 
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="w-4 h-4 text-primary" /> Library
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showHistory ? "Hide Sidepanel" : "Show Library"}</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="h-6 w-px bg-border mx-2" />

            {!user ? (
              <Button size="sm" className="h-9 rounded-lg px-5 shadow-md shadow-primary/10" onClick={handleLogin} disabled={signingIn}>
                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                Sign In
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Studio Settings</TooltipContent>
                </Tooltip>
                
                <div className="flex items-center gap-2 pl-2 border-l">
                  <Avatar className="h-8 w-8 rounded-lg ring-2 ring-primary/10">
                    <AvatarImage src={user.photoURL || ""} className="rounded-lg" />
                    <AvatarFallback className="rounded-lg">{user.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Panel (Left Side) */}
        {showHistory && user && (
          <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-left duration-500">
            {/* Developer Card */}
            <Card className="shadow-xl border-none overflow-hidden relative group/dev bg-white/80 backdrop-blur-sm">
              <div className="absolute top-2 right-2 z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/50 backdrop-blur-sm hover:bg-primary/10 hover:text-primary" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                  {isEditingProfile ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </Button>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-primary/10 shadow-md">
                    <img 
                      src={devPortrait} 
                      alt="Profile" 
                      className="h-full w-full object-cover object-top"
                      data-ai-hint="developer portrait"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingProfile ? (
                      <Input 
                        value={profileForm.displayName} 
                        onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} 
                        className="h-7 text-sm mb-1 bg-secondary/30"
                        placeholder="Your Name"
                      />
                    ) : (
                      <CardTitle className="text-lg font-bold truncate text-primary">{profileForm.displayName || "Anonymous Engineer"}</CardTitle>
                    )}
                    {isEditingProfile ? (
                      <Input 
                        value={profileForm.roleTagline} 
                        onChange={e => setProfileForm({...profileForm, roleTagline: e.target.value})} 
                        className="h-7 text-xs bg-secondary/30"
                        placeholder="Role Tagline"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground font-semibold truncate">{profileForm.roleTagline}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <Textarea 
                    value={profileForm.bio} 
                    onChange={e => setProfileForm({...profileForm, bio: e.target.value})} 
                    className="text-xs min-h-[60px] bg-secondary/30"
                    placeholder="Short bio..."
                  />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">"{profileForm.bio}"</p>
                )}
                <div className="flex gap-2">
                  <SocialLink icon={Github} href={profileForm.githubUrl} editMode={isEditingProfile} value={profileForm.githubUrl} onChange={v => setProfileForm({...profileForm, githubUrl: v})} />
                  <SocialLink icon={Linkedin} href={profileForm.linkedinUrl} editMode={isEditingProfile} value={profileForm.linkedinUrl} onChange={v => setProfileForm({...profileForm, linkedinUrl: v})} />
                  <SocialLink icon={Globe} href={profileForm.portfolioUrl} editMode={isEditingProfile} value={profileForm.portfolioUrl} onChange={v => setProfileForm({...profileForm, portfolioUrl: v})} />
                </div>
                {isEditingProfile && (
                  <Button size="sm" className="w-full h-9 shadow-md shadow-primary/20" onClick={handleSaveProfile}>
                    <Save className="w-3.5 h-3.5 mr-2" /> Save Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none bg-gradient-to-br from-white to-secondary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="w-4 h-4" /> App Overview
                  </CardTitle>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] border-emerald-200">v1.3.0-LIVE</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <StatItem icon={Zap} label="Styles" value="4 Active" />
                  <StatItem icon={BarChart3} label="Engine" value="Gemini 2.5" />
                  <StatItem icon={Clock} label="Status" value="Optimized" />
                  <StatItem icon={ShieldCheck} label="Tier" value="Spark" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none flex-1 flex flex-col min-h-[350px] bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Library
                  </CardTitle>
                  <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold">{filteredHistory.length}</Badge>
                </div>
                <div className="relative pt-3">
                  <Search className="absolute left-3 top-6 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Search library..." className="pl-8 h-8 text-[11px] bg-secondary/30 border-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
                  <TabsList className="grid grid-cols-2 h-8 bg-secondary/40">
                    <TabsTrigger value="all" className="text-[10px] data-[state=active]:bg-white">All Work</TabsTrigger>
                    <TabsTrigger value="starred" className="text-[10px] data-[state=active]:bg-white"><Star className="w-2.5 h-2.5 mr-1 fill-amber-500 text-amber-500" /> Starred</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden flex-1">
                <ScrollArea className="h-[280px] px-4 pb-4">
                  <div className="space-y-2">
                    {filteredHistory.map(item => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-3 border rounded-xl bg-secondary/5 group relative hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all cursor-pointer",
                          activeDocId === item.id && "border-primary/30 bg-primary/5 shadow-inner"
                        )}
                        onClick={() => {
                          setResults({ rawThought: item.rawThought, detectedIntent: item.detectedIntent, prompts: item.prompts });
                          setActiveDocId(item.id);
                          setRawThought(item.rawThought);
                        }}
                      >
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:bg-destructive/10 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db!, "savedPrompts", item.id)); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <div className="flex items-center gap-1.5 mb-1.5 pr-6">
                          {item.prompts.some((p: any) => p.isStarred) && <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />}
                          <p className="text-[10px] font-bold truncate text-foreground">{item.detectedIntent}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground line-clamp-1 italic pr-6">"{item.rawThought}"</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn("space-y-8 transition-all duration-500", showHistory && user ? "lg:col-span-8" : "lg:col-span-12")}>
          <Card className="shadow-xl border-none bg-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary w-full" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Workspace
              </CardTitle>
              <CardDescription className="text-xs">Describe your core idea. We'll architect the instructions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="Describe your goal... e.g., A blog post about future space travel or a technical bug report."
                className="min-h-[140px] text-lg border-primary/10 focus-visible:ring-primary/20 bg-secondary/10 rounded-xl leading-relaxed"
                value={rawThought}
                onChange={(e) => setRawThought(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {results?.detectedIntent && (
                  <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 animate-in fade-in zoom-in duration-300">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Architect's Intent Detection:</span>
                    <span className="text-sm font-semibold text-foreground">{results.detectedIntent}</span>
                  </div>
                )}
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white ml-auto h-12 px-8 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all font-bold"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  {loading ? "Architecting..." : "Generate Variations"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {results && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
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
      </div>
    </div>
  );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">{number}</div>
      <div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StyleDetail({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="p-3 border rounded-xl hover:border-primary/30 transition-colors flex gap-3">
      <div className="bg-primary/5 p-2 rounded-lg text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-[13px] font-bold">{title}</h4>
        <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
      </div>
    </div>
  );
}

function SocialLink({ icon: Icon, href, editMode, value, onChange }: { icon: any; href: string; editMode: boolean; value: string; onChange: (v: string) => void }) {
  if (editMode) return <Input value={value} onChange={e => onChange(e.target.value)} className="h-7 text-[10px] bg-secondary/30" placeholder="URL" />;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-primary hover:text-white transition-all">
      <Icon className="w-3.5 h-3.5" />
    </a>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/50 border border-primary/5 shadow-sm">
      <div className="bg-primary/10 p-1.5 rounded-lg">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div>
        <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-[11px] font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
