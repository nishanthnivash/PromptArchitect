
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
import { collection, addDoc, serverTimestamp, query, where, orderBy, deleteDoc, doc, updateDoc, setDoc, limit } from "firebase/firestore";
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
    displayName: "Nishanth S",
    roleTagline: "AI Prompt Engineer",
    bio: "Exploring the boundaries of LLM capabilities.",
    githubUrl: "https://github.com/nishanthnivash/PromptArchitect",
    linkedinUrl: "https://www.linkedin.com/in/nishanth-s-77b4a3264",
    portfolioUrl: ""
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || "Nishanth S",
        roleTagline: profile.roleTagline || "AI Prompt Engineer",
        bio: profile.bio || "Exploring the boundaries of LLM capabilities.",
        githubUrl: profile.githubUrl || "https://github.com/nishanthnivash/PromptArchitect",
        linkedinUrl: profile.linkedinUrl || "https://www.linkedin.com/in/nishanth-s-77b4a3264",
        portfolioUrl: profile.portfolioUrl || ""
      });
    } else if (user) {
      setProfileForm(prev => ({ ...prev, displayName: user.displayName || "Nishanth S" }));
    }
  }, [profile, user]);

  const historyQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "savedPrompts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
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
        toast({ 
          title: "Sign in failed", 
          description: `Error: ${error.code}`,
          variant: "destructive" 
        });
        console.error("Firebase Auth Error:", error);
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
      toast({ 
        title: "Architecting Failed", 
        description: "Verify your GOOGLE_GENAI_API_KEY in Vercel settings.",
        variant: "destructive" 
      });
      console.error("Generation error:", error);
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

  // --- RENDERING LOGIC ---

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden">
        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PromptArchitect</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</a>
            <Button onClick={handleLogin} disabled={signingIn} className="rounded-full px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 transition-all active:scale-95 shadow-lg shadow-slate-200">
              {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Started"}
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge variant="secondary" className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border-none text-xs font-bold animate-pulse">
              🚀 Now Powered by Gemini 2.5 Flash
            </Badge>
            <h1 className="text-6xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Architect <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Better Prompts</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
              Turn raw thoughts into high-performance AI instructions. Our multi-style architecture engine crafts perfectly structured prompts for any LLM.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={handleLogin} size="lg" className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all">
                Start Engineering Free
              </Button>
              <div className="flex items-center gap-3 px-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 shadow-sm" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-500">Join 1,000+ engineers</p>
              </div>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-20 group-hover:opacity-30 transition-all duration-1000" />
            <div className="relative bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 transform hover:rotate-1 transition-all duration-500">
              <div className="bg-slate-50 rounded-2xl p-8 space-y-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-32 w-full bg-slate-100 rounded-xl border border-dashed border-slate-300 flex items-center justify-center">
                    <Terminal className="w-8 h-8 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="bg-white border-y border-slate-100 py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="text-4xl font-bold text-slate-900">Built for AI Engineers</h2>
              <p className="text-slate-500 text-lg">Stop guessing how to talk to LLMs. Use professional framework patterns used by experts.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard icon={Zap} title="Instant Multi-Style" desc="Generate Persona, COT, Technical, and Marketing styles in one click." />
              <FeatureCard icon={BarChart3} title="Quality Scoring" desc="AI-driven metrics for Clarity, Specificity, and Expected Outcome." />
              <FeatureCard icon={History} title="Persistent Library" desc="Save your best architectures and access them from any device." />
            </div>
          </div>
        </section>

        {/* Meet the Dev Footer */}
        <footer className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
             <div className="space-y-4">
               <h3 className="text-2xl font-bold text-slate-900">Crafted by Nishanth S</h3>
               <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                 I built PromptArchitect to bridge the gap between human intuition and machine precision. Every feature is designed for speed and clarity.
               </p>
             </div>
             <div className="flex flex-wrap justify-center gap-4">
               <Button variant="outline" className="rounded-full gap-2 px-8" asChild>
                 <a href="https://github.com/nishanthnivash" target="_blank"><Github className="w-4 h-4" /> Github</a>
               </Button>
               <Button variant="outline" className="rounded-full gap-2 px-8" asChild>
                 <a href="https://linkedin.com/in/nishanth-s-77b4a3264" target="_blank"><Linkedin className="w-4 h-4" /> LinkedIn</a>
               </Button>
             </div>
             <div className="pt-12 border-t border-slate-200">
               <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">© 2024 PromptArchitect Studio · All Rights Reserved</p>
             </div>
          </div>
        </footer>
      </div>
    );
  }

  // --- DASHBOARD VIEW (AUTHENTICATED) ---

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 sticky top-4 z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div onClick={handleNewPrompt} className="cursor-pointer group">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none group-hover:text-primary transition-colors">PromptArchitect</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Studio Dashboard</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <TooltipProvider>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 px-4 gap-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-primary">
                      <BookOpen className="w-4 h-4" /> Guide
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-slate-900 text-white">
                      <DialogTitle className="text-3xl font-bold">Studio Handbook</DialogTitle>
                      <DialogDescription className="text-slate-400 text-base">
                        Master the art of Prompt Architecture.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-8 bg-white">
                      <div className="space-y-12">
                        <section>
                          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-900">
                            <Zap className="w-5 h-5 text-primary" /> Engineering Workflow
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <StepItem number="1" title="Raw Ideation" desc="Input your core concept. No need for formatting—just pure objective." />
                            <StepItem number="2" title="Intent Extraction" desc="Gemini identifies hidden context and requirements in your thought." />
                            <StepItem number="3" title="Pattern Architecture" desc="Four distinct frameworks are mapped to your specific goal." />
                            <StepItem number="4" title="Performance Scoring" desc="Every prompt is stress-tested for clarity and specificity." />
                          </div>
                        </section>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={showHistory ? "secondary" : "ghost"} 
                      size="sm" 
                      className={cn("h-9 px-4 gap-2 text-xs font-bold transition-all", showHistory ? "bg-white text-primary shadow-sm" : "text-slate-600")} 
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="w-4 h-4" /> Library
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showHistory ? "Focus Mode" : "Show Library"}</TooltipContent>
                </Tooltip>
              </div>

              <div className="h-8 w-px bg-slate-200 mx-2" />

              <div className="flex items-center gap-3 pl-2">
                <div className="hidden sm:block text-right mr-1">
                  <p className="text-[11px] font-bold text-slate-900 leading-none mb-1">{user.displayName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Pro Engineer</p>
                </div>
                <Avatar className="h-10 w-10 rounded-xl ring-4 ring-slate-50 transition-transform hover:scale-105">
                  <AvatarImage src={user.photoURL || ""} className="rounded-xl" />
                  <AvatarFallback className="rounded-xl bg-primary text-white font-bold">{user.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Panel (Left Side) */}
          {showHistory && (
            <div className="lg:col-span-3 space-y-6 animate-in slide-in-from-left duration-500">
              {/* Developer Profile Card */}
              <Card className="shadow-2xl border-none overflow-hidden relative bg-white group/dev ring-1 ring-slate-200/50">
                <div className="absolute top-3 right-3 z-10">
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-slate-50/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                    {isEditingProfile ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </Button>
                </div>
                <CardHeader className="pb-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-slate-50 shadow-xl group-hover/dev:scale-105 transition-transform duration-500">
                      <img 
                        src={devPortrait} 
                        alt="Profile" 
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div className="w-full">
                      {isEditingProfile ? (
                        <Input 
                          value={profileForm.displayName} 
                          onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} 
                          className="h-8 text-sm mb-2 text-center bg-slate-50"
                          placeholder="Your Name"
                        />
                      ) : (
                        <CardTitle className="text-xl font-bold text-slate-900">{profileForm.displayName}</CardTitle>
                      )}
                      {isEditingProfile ? (
                        <Input 
                          value={profileForm.roleTagline} 
                          onChange={e => setProfileForm({...profileForm, roleTagline: e.target.value})} 
                          className="h-8 text-xs text-center bg-slate-50"
                          placeholder="Role Tagline"
                        />
                      ) : (
                        <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">{profileForm.roleTagline}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditingProfile ? (
                    <Textarea 
                      value={profileForm.bio} 
                      onChange={e => setProfileForm({...profileForm, bio: e.target.value})} 
                      className="text-xs min-h-[80px] bg-slate-50 text-center"
                      placeholder="Bio..."
                    />
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed italic text-center px-2">"{profileForm.bio}"</p>
                  )}
                  <div className="flex justify-center gap-3">
                    <SocialLink icon={Github} href={profileForm.githubUrl} editMode={isEditingProfile} value={profileForm.githubUrl} onChange={v => setProfileForm({...profileForm, githubUrl: v})} />
                    <SocialLink icon={Linkedin} href={profileForm.linkedinUrl} editMode={isEditingProfile} value={profileForm.linkedinUrl} onChange={v => setProfileForm({...profileForm, linkedinUrl: v})} />
                    <SocialLink icon={Globe} href={profileForm.portfolioUrl} editMode={isEditingProfile} value={profileForm.portfolioUrl} onChange={v => setProfileForm({...profileForm, portfolioUrl: v})} />
                  </div>
                  {isEditingProfile && (
                    <Button size="sm" className="w-full h-10 shadow-lg shadow-primary/20" onClick={handleSaveProfile}>
                      <Save className="w-4 h-4 mr-2" /> Save Profile
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Library Panel */}
              <Card className="shadow-2xl border-none flex-1 flex flex-col min-h-[450px] bg-white ring-1 ring-slate-200/50 overflow-hidden">
                <CardHeader className="pb-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <History className="w-4 h-4 text-primary" /> Library
                    </CardTitle>
                    <Badge className="bg-slate-900 text-white border-none text-[10px] font-bold px-2.5">{filteredHistory.length}</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input placeholder="Search prompts..." className="pl-9 h-9 text-[11px] bg-white border-slate-200 rounded-lg focus-visible:ring-primary/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid grid-cols-2 h-9 bg-slate-100 p-1 rounded-lg">
                      <TabsTrigger value="all" className="text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Everything</TabsTrigger>
                      <TabsTrigger value="starred" className="text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm"><Star className="w-2.5 h-2.5 mr-1.5 fill-amber-500 text-amber-500" /> Starred</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <ScrollArea className="h-[350px] p-4">
                    <div className="space-y-3">
                      {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-40">
                          <PlusCircle className="w-8 h-8 text-slate-300" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Your library is empty</p>
                          <p className="text-[10px] text-slate-400 max-w-[150px]">Generate a prompt to start building your studio collection.</p>
                        </div>
                      ) : (
                        filteredHistory.map(item => (
                          <div 
                            key={item.id} 
                            className={cn(
                              "p-3.5 border rounded-xl bg-white group relative hover:border-primary/40 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer border-slate-100",
                              activeDocId === item.id && "border-primary/40 bg-primary/[0.02] shadow-inner"
                            )}
                            onClick={() => {
                              setResults({ rawThought: item.rawThought, detectedIntent: item.detectedIntent, prompts: item.prompts });
                              setActiveDocId(item.id);
                              setRawThought(item.rawThought);
                            }}
                          >
                            <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-7 w-7 text-rose-500 hover:bg-rose-50 transition-all" onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db!, "savedPrompts", item.id)); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <div className="flex items-center gap-2 mb-2 pr-6">
                              {item.prompts.some((p: any) => p.isStarred) && <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />}
                              <p className="text-[11px] font-bold truncate text-slate-900">{item.detectedIntent}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">"{item.rawThought}"</p>
                            <p className="text-[8px] text-slate-300 mt-2 font-bold uppercase tracking-tighter">
                              {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : "Just now"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Area */}
          <div className={cn("space-y-8 transition-all duration-500", showHistory ? "lg:col-span-9" : "lg:col-span-12")}>
            <Card className="shadow-2xl border-none bg-white overflow-hidden ring-1 ring-slate-200/50">
              <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary w-full" />
              <CardHeader className="pb-4 pt-8 px-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                      <Terminal className="w-6 h-6 text-primary" /> Engineering Workspace
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-400 mt-1">Describe your objective. Gemini will architect the instructions.</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-8 px-4 rounded-full border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    v1.4.0 Studio
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <Textarea
                  placeholder="Describe your goal... e.g., 'Draft a technical audit of a React codebase' or 'A persuasive email for a series B funding round'."
                  className="min-h-[160px] text-xl border-slate-100 focus-visible:ring-primary/10 bg-slate-50/50 rounded-2xl leading-relaxed placeholder:text-slate-300 transition-all hover:bg-slate-50"
                  value={rawThought}
                  onChange={(e) => setRawThought(e.target.value)}
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  {results?.detectedIntent ? (
                    <div className="flex items-center gap-4 bg-primary/[0.03] px-6 py-3 rounded-2xl border border-primary/10 animate-in fade-in zoom-in duration-500">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <div>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-0.5">Architect's Intent Detection</p>
                        <p className="text-[15px] font-bold text-slate-900">{results.detectedIntent}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400 px-2">
                       <Lightbulb className="w-4 h-4" />
                       <p className="text-xs font-medium italic">Tip: Be as specific as possible for better architectures.</p>
                    </div>
                  )}
                  <Button 
                    onClick={handleGenerate} 
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-white ml-auto h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all font-bold text-base"
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {loading ? "Architecting..." : "Generate Variations"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {results.prompts.map((p: any, idx: number) => (
                  <div key={idx} className="transform hover:-translate-y-1 transition-transform duration-300">
                    <PromptCard
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group">
      <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-primary transition-colors">
        <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
      </div>
      <h4 className="text-xl font-bold text-slate-900 mb-4">{title}</h4>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="bg-slate-100 text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 text-sm shadow-sm">{number}</div>
      <div>
        <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SocialLink({ icon: Icon, href, editMode, value, onChange }: { icon: any; href: string; editMode: boolean; value: string; onChange: (v: string) => void }) {
  if (editMode) return <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 text-[11px] bg-slate-50 text-center" placeholder="URL" />;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all">
      <Icon className="w-4 h-4" />
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
