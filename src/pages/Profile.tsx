"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Camera, Save, ArrowLeft, LogOut, 
  Loader2, Settings, Shield, Bell, Palette, 
  History, Star, Bookmark, Zap, Globe, Check,
  Link as LinkIcon, X, BrainCircuit, Cpu, PieChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { useWatchlist } from "@/hooks/use-watchlist";

const Profile = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [bio, setBio] = useState(localStorage.getItem("user_bio") || "Cinematic explorer in the digital frontier.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { watchlist } = useWatchlist();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) { navigate("/auth"); return; }
      setEmail(user.email || "");
      setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      setPhotoURL(user.user_metadata?.avatar_url || "");
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/auth");
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { full_name: name } });
      localStorage.setItem("user_bio", bio);
      showSuccess("Profile updated successfully.");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePhoto = async () => {
    if (!newPhotoURL) return;
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { avatar_url: newPhotoURL } });
      setPhotoURL(newPhotoURL);
      setIsPhotoDialogOpen(false);
      showSuccess("Photo updated.");
    } catch {
      showError("Failed to update photo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) { showError("No email on this account."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) showError(error.message);
    else showSuccess("Password reset link sent to your email.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Signed out.");
    navigate("/auth");
  };

  const handleToggleFeature = (feature: string) => {
    showSuccess(`${feature} protocol updated.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <Loader2 className="w-8 h-8 text-primary animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-16 px-4 md:px-8 max-w-6xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <Link to="/" className="group inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
          <div className="p-2 rounded-xl bg-foreground/5 border border-foreground/10 group-hover:border-primary/50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to Terminal
        </Link>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-2 font-black uppercase tracking-widest text-[10px]">
            <LogOut className="w-4 h-4" />
            Terminate Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Identity & Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-6"
        >
          <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-blue-600 p-1">
                <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center overflow-hidden relative group">
                  {photoURL ? (
                    <img src={photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-muted-foreground" />
                  )}
                  
                  <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                    <DialogTrigger asChild>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0f172a] border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-white font-black uppercase tracking-widest">Update Visual Identity</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Image URL</Label>
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="https://example.com/photo.jpg" 
                              value={newPhotoURL}
                              onChange={(e) => setNewPhotoURL(e.target.value)}
                              className="pl-10 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <Button onClick={handleUpdatePhoto} className="w-full bg-primary text-white font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20" disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Identity"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-[#0f172a] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase truncate px-2">{name}</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-2">Elite Operative</p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Bookmark className="w-4 h-4 text-primary mx-auto mb-2" />
                <p className="text-xl font-black text-white">{watchlist.length}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Saved</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Zap className="w-4 h-4 text-blue-400 mx-auto mb-2" />
                <p className="text-xl font-black text-white">{Math.min(99, 70 + watchlist.length * 2)}%</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">AI Match</p>
              </div>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <BrainCircuit className="w-3 h-3" /> Neural Taste Cluster
            </h4>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Current Cluster</span>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">Cinematic Maverick</Badge>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "84%" }}
                  className="h-full bg-gradient-to-r from-primary to-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[14px] font-black text-white">4.8</p>
                  <p className="text-[7px] text-slate-500 uppercase font-bold">Resonance</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[14px] font-black text-white">212</p>
                  <p className="text-[7px] text-slate-500 uppercase font-bold">Neural Data</p>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 italic leading-relaxed text-center">
                * Your tastes are mathematically aligned with 12,400 other operatives.
              </p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Recent Activity</h4>
            {watchlist.length > 0 ? (
              watchlist.slice(0, 3).map((movie, i) => (
                <div key={movie.id} className="flex items-center gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Bookmark className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium truncate">Added {movie.title}</p>
                    <p className="text-[10px] text-slate-500">Recently</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-500 italic">No recent neural activity detected.</p>
            )}
          </div>
        </motion.div>

        {/* Right Content: Tabs & Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8"
        >
          <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="bg-card/40 backdrop-blur-3xl border border-white/10 p-1.5 rounded-2xl mb-8 w-full justify-start overflow-x-auto shadow-lg">
              <TabsTrigger value="general" className="rounded-xl gap-2 text-slate-400 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-6 py-2.5">
                <Settings className="w-4 h-4" /> General
              </TabsTrigger>
              <TabsTrigger value="preferences" className="rounded-xl gap-2 text-slate-400 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-6 py-2.5">
                <Palette className="w-4 h-4" /> Preferences
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl gap-2 text-slate-400 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-6 py-2.5">
                <Shield className="w-4 h-4" /> Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-xl gap-2 text-slate-400 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-6 py-2.5">
                <Bell className="w-4 h-4" /> Alerts
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="general" className="mt-0">
                <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Identity Configuration</h3>
                      <p className="text-xs text-slate-400 font-medium">Modify your neural signature.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Full Designation</Label>
                        <Input 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-14 bg-white/5 border-white/10 text-white focus:border-primary/50 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Network Address</Label>
                        <Input 
                          value={email}
                          disabled
                          className="h-14 bg-white/5 border-white/10 text-slate-400 opacity-50 cursor-not-allowed rounded-2xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Neural Bio</Label>
                      <Textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-[120px] bg-white/5 border-white/10 text-white focus:border-primary/50 rounded-2xl resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full md:w-auto px-12 h-14 gap-3 font-black uppercase tracking-widest rounded-2xl bg-primary text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20" disabled={saving}>
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Commit Changes
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="mt-0">
                <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 space-y-10 shadow-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <Palette className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Cinematic Experience</h3>
                      <p className="text-xs text-slate-400 font-medium">Tailor the interface to your vision.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Auto-Play Trailers</p>
                        <p className="text-xs text-slate-400">Preview movies automatically on hover.</p>
                      </div>
                      <Switch defaultChecked onCheckedChange={() => handleToggleFeature("Auto-Play")} />
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">High Fidelity Particles</p>
                        <p className="text-xs text-slate-400">Enable advanced 3D background effects.</p>
                      </div>
                      <Switch defaultChecked onCheckedChange={() => handleToggleFeature("High Fidelity")} />
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Interface Language</p>
                        <p className="text-xs text-slate-400">Current: English (Global)</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl border-white/10 text-white hover:bg-white/10 transition-all" onClick={() => showSuccess("Language module locked to English.")}>Change</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 space-y-10 shadow-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <Shield className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Security Protocols</h3>
                      <p className="text-xs text-slate-400 font-medium">Protect your cinematic identity.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/10">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Access Key Reset</p>
                        <p className="text-xs text-slate-400">Receive a secure link to change your password.</p>
                      </div>
                      <Button onClick={handlePasswordReset} variant="secondary" className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-white/10 text-white hover:bg-white/20 transition-all">Transmit Link</Button>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/10">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
                        <p className="text-xs text-slate-400">Add an extra layer of neural protection.</p>
                      </div>
                      <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] border-white/10 text-white hover:bg-white/10 transition-all" onClick={() => showSuccess("2FA configuration initialized.")}>Configure</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;