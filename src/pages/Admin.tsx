import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Film, Trash2, Plus, ArrowLeft,
  ShieldCheck, Loader2, Check, CreditCard, Users,
  RefreshCw, Eye, TrendingUp, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

const MOOD_OPTIONS = [
  "happy", "heartwarming", "sad", "adrenaline", "epic",
  "mind-bending", "spooky", "fear", "chill", "neutral"
];

const TABS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "movies", label: "Movies", icon: Film },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "moods", label: "Mood Logs", icon: TrendingUp },
];

const emptyForm = {
  title: "",
  overview: "",
  poster_url: "",
  trailer_url: "",
  stream_url: "",
  release_date: "",
  vote_average: "",
  is_premium: false,
  mood_tags: [] as string[],
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [movies, setMovies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [moodLogs, setMoodLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ movies: 0, users: 0, subscriptions: 0, moods: 0 });
  const [modelMeta, setModelMeta] = useState<{ val_accuracy: number; val_loss: number; epochs_trained: number; total_samples: number; custom_samples: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadStats();
    fetch("/models/emotion_cnn.metadata.json", { cache: "no-store" })
      .then(r => r.json())
      .then(setModelMeta)
      .catch(() => null);
  }, []);
  useEffect(() => {
    if (activeTab === "movies") loadMovies();
    if (activeTab === "users") loadUsers();
    if (activeTab === "subscriptions") loadSubscriptions();
    if (activeTab === "moods") loadMoodLogs();
  }, [activeTab]);

  async function loadStats() {
    const [{ count: mc }, { count: uc }, { count: sc }, { count: ml }] = await Promise.all([
      supabase.from("movies").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("mood_scan_events").select("*", { count: "exact", head: true }),
    ]);
    setStats({ movies: mc || 0, users: uc || 0, subscriptions: sc || 0, moods: ml || 0 });
  }

  async function loadMovies() {
    setLoading(true);
    const { data } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    setMovies(data || []);
    setLoading(false);
  }

  async function loadUsers() {
    setLoading(true);
    const [{ data: usersData }, { data: subData }, { data: watchlistData }] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, plan").order("created_at", { ascending: false }),
      supabase.from("watchlist_items").select("user_key"),
    ]);

    const planMap: Record<string, string> = {};
    (subData || []).forEach((s) => { planMap[s.user_id] = s.plan; });

    const savesMap: Record<string, number> = {};
    (watchlistData || []).forEach((w) => { savesMap[w.user_key] = (savesMap[w.user_key] || 0) + 1; });

    const list = (usersData || []).map((u) => ({
      user_key: u.id,
      name: u.full_name || u.email?.split("@")[0] || "User",
      email: u.email || "",
      saves: savesMap[u.id] || 0,
      plan: planMap[u.id] || "",
      last_active: u.created_at,
    }));

    setUsers(list);
    setLoading(false);
  }

  async function loadSubscriptions() {
    setLoading(true);
    const { data } = await supabase.from("subscriptions").select("*").order("start_date", { ascending: false });
    setSubscriptions(data || []);
    setLoading(false);
  }

  async function loadMoodLogs() {
    setLoading(true);
    const { data } = await supabase.from("mood_scan_events").select("*").order("created_at", { ascending: false }).limit(50);
    setMoodLogs(data || []);
    setLoading(false);
  }

  function toggleMood(mood: string) {
    setForm((f) => ({
      ...f,
      mood_tags: f.mood_tags.includes(mood)
        ? f.mood_tags.filter((m) => m !== mood)
        : [...f.mood_tags, mood],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.poster_url || form.mood_tags.length === 0) {
      showError("Title, poster URL and at least one mood tag are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("movies").insert({
      title: form.title,
      overview: form.overview,
      poster_url: form.poster_url,
      trailer_url: form.trailer_url || null,
      stream_url: form.stream_url || null,
      release_date: form.release_date || null,
      vote_average: parseFloat(form.vote_average) || 0,
      is_premium: form.is_premium,
      mood_tags: form.mood_tags,
    });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess(`"${form.title}" added!`);
    setForm(emptyForm);
    setShowForm(false);
    loadMovies();
    loadStats();
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from("movies").delete().eq("id", id);
    showSuccess("Movie deleted.");
    loadMovies();
    loadStats();
  }

  const STAT_CARDS = [
    { label: "Total Movies", value: stats.movies, icon: Film, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Active Users", value: stats.users, icon: Users, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Subscriptions", value: stats.subscriptions, icon: CreditCard, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Mood Scans", value: stats.moods, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-card/40 backdrop-blur-3xl p-6 hidden lg:flex flex-col z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/40">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Film<span className="text-primary">Flix</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === item.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 flex-1 p-8 space-y-8">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Dashboard</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Live data from Supabase</p>
              </div>
              <Button variant="ghost" onClick={loadStats} className="gap-2 rounded-2xl">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STAT_CARDS.map((s) => (
                <div key={s.label} className="bg-card/40 border border-white/10 rounded-[2rem] p-6 space-y-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                    <s.icon className={cn("w-5 h-5", s.color)} />
                  </div>
                  <p className="text-3xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-card/40 border border-white/10 rounded-[2rem] p-8 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setActiveTab("movies")} className="gap-2 rounded-2xl"><Film className="w-4 h-4" /> Manage Movies</Button>
                <Button onClick={() => setActiveTab("users")} variant="secondary" className="gap-2 rounded-2xl"><Users className="w-4 h-4" /> View Users</Button>
                <Button onClick={() => setActiveTab("moods")} variant="secondary" className="gap-2 rounded-2xl"><TrendingUp className="w-4 h-4" /> Mood Analytics</Button>
              </div>
            </div>

            {/* AI Model Stats */}
            <div className="bg-card/40 border border-white/10 rounded-[2rem] p-8 space-y-5">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">Emotion AI Model</h3>
              </div>
              {modelMeta ? (
                <div className="space-y-4">
                  {/* Accuracy bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-widest">Validation Accuracy</span>
                      <span className="text-green-400 font-black">{(modelMeta.val_accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${modelMeta.val_accuracy * 100}%` }} />
                    </div>
                  </div>
                  {/* Loss bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-widest">Validation Loss</span>
                      <span className="text-orange-400 font-black">{modelMeta.val_loss.toFixed(4)}</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-400 rounded-full" style={{ width: `${Math.min(modelMeta.val_loss * 30, 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                      { label: "Epochs", value: modelMeta.epochs_trained },
                      { label: "Total Samples", value: modelMeta.total_samples.toLocaleString() },
                      { label: "Custom Images", value: modelMeta.custom_samples },
                    ].map(s => (
                      <div key={s.label} className="bg-white/5 rounded-2xl p-4 text-center">
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-slate-500 text-sm font-bold">Model not trained yet</p>
                  <p className="text-xs text-slate-600 font-mono bg-white/5 rounded-xl px-4 py-2 inline-block">
                    python backend/train_custom_model.py
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* MOVIES */}
        {activeTab === "movies" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Movie Library</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{movies.length} movies</p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={loadMovies} className="gap-2 rounded-2xl"><RefreshCw className="w-4 h-4" /></Button>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2 font-black uppercase tracking-widest rounded-2xl">
                  <Plus className="w-4 h-4" /> Add Movie
                </Button>
              </div>
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card/40 border border-white/10 rounded-[2rem] p-8 space-y-6">
                <h3 className="text-lg font-black uppercase tracking-tight">New Movie</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Title *", key: "title", placeholder: "Movie title" },
                      { label: "Release Date", key: "release_date", placeholder: "2024-01-01" },
                      { label: "Poster URL *", key: "poster_url", placeholder: "https://..." },
                      { label: "Rating (0-10)", key: "vote_average", placeholder: "8.5", type: "number" },
                      { label: "Trailer URL (YouTube)", key: "trailer_url", placeholder: "https://youtube.com/watch?v=..." },
                      { label: "Stream URL (Premium)", key: "stream_url", placeholder: "https://..." },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">{field.label}</Label>
                        <Input
                          type={field.type || "text"}
                          value={(form as any)[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="bg-white/5 border-white/10 text-white rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Overview</Label>
                    <Textarea value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} placeholder="Movie description..." className="bg-white/5 border-white/10 text-white rounded-xl resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Mood Tags *</Label>
                    <div className="flex flex-wrap gap-2">
                      {MOOD_OPTIONS.map((mood) => (
                        <button key={mood} type="button" onClick={() => toggleMood(mood)}
                          className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            form.mood_tags.includes(mood) ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-slate-400 hover:border-primary/40"
                          )}>
                          {form.mood_tags.includes(mood) && <Check className="w-3 h-3 inline mr-1" />}{mood}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_premium} onCheckedChange={(v) => setForm({ ...form, is_premium: v })} />
                    <Label className="text-sm font-bold text-white">Premium (requires subscription)</Label>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving} className="gap-2 font-black uppercase tracking-widest rounded-2xl">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {saving ? "Saving..." : "Add Movie"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="rounded-2xl">Cancel</Button>
                  </div>
                </form>
              </motion.div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                {movies.map((movie) => (
                  <div key={movie.id} className="flex items-center gap-5 bg-card/40 border border-white/10 rounded-2xl p-4">
                    <img src={movie.poster_url} alt={movie.title} className="w-12 h-18 object-cover rounded-xl w-12 h-16" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white truncate">{movie.title}</p>
                      <p className="text-xs text-slate-500 truncate">{movie.overview}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(movie.mood_tags || []).map((tag: string) => (
                          <Badge key={tag} className="text-[8px] font-black uppercase bg-primary/20 text-primary border-none">{tag}</Badge>
                        ))}
                        {movie.is_premium && <Badge className="text-[8px] font-black uppercase bg-yellow-500/20 text-yellow-400 border-none">Premium</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-black">⭐ {movie.vote_average}</p>
                      <p className="text-xs text-slate-500">{movie.release_date?.slice(0, 4)}</p>
                      <button onClick={() => handleDelete(movie.id, movie.title)} className="mt-1 p-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Users</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{users.length} active users</p>
              </div>
              <Button variant="ghost" onClick={loadUsers} className="gap-2 rounded-2xl"><RefreshCw className="w-4 h-4" /></Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Users className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-black uppercase tracking-widest text-sm">No users yet</p>
                <p className="text-xs mt-1">Users appear here once they save movies to watchlist</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user, i) => (
                  <div key={user.user_key} className="flex items-center gap-5 bg-card/40 border border-white/10 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary shrink-0">
                      {(user.name || user.email || user.user_key).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{user.name || "Guest User"}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email || user.user_key}</p>
                      <p className="text-xs text-slate-500">Last active: {new Date(user.last_active).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {user.plan && <Badge className="bg-yellow-500/20 text-yellow-400 border-none font-black uppercase text-[10px]">{user.plan}</Badge>}
                      <p className="font-black text-white">{user.saves}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Saved</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Subscriptions</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{subscriptions.length} total</p>
              </div>
              <Button variant="ghost" onClick={loadSubscriptions} className="gap-2 rounded-2xl"><RefreshCw className="w-4 h-4" /></Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : subscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <CreditCard className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-black uppercase tracking-widest text-sm">No subscriptions yet</p>
                <p className="text-xs mt-1">Subscriptions appear here once users subscribe</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="bg-card/40 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm truncate">{sub.user_id}</p>
                        <p className="text-xs text-slate-500">Started: {new Date(sub.start_date).toLocaleDateString("en-IN")}</p>
                        {sub.movie_title && <p className="text-xs text-slate-400 mt-0.5">For: <span className="text-white">{sub.movie_title}</span></p>}
                      </div>
                      <div className="flex gap-2 items-center shrink-0">
                        <Badge className={cn("font-black uppercase text-[10px]",
                          sub.plan === "premium" ? "bg-yellow-500/20 text-yellow-400 border-none" : "bg-primary/20 text-primary border-none"
                        )}>{sub.plan}</Badge>
                        <Badge className={cn("font-black uppercase text-[10px]",
                          sub.status === "active" ? "bg-green-500/20 text-green-400 border-none" : "bg-red-500/20 text-red-400 border-none"
                        )}>{sub.status}</Badge>
                        {sub.amount && <span className="text-green-400 font-black text-sm">₹{sub.amount}</span>}
                      </div>
                    </div>
                    {sub.payment_id && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Razorpay ID:</span>
                        <span className="text-xs font-mono text-slate-300">{sub.payment_id}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* MOOD LOGS */}
        {activeTab === "moods" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Mood Analytics</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Last 50 scans</p>
              </div>
              <Button variant="ghost" onClick={loadMoodLogs} className="gap-2 rounded-2xl"><RefreshCw className="w-4 h-4" /></Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : moodLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <TrendingUp className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-black uppercase tracking-widest text-sm">No mood scans yet</p>
              </div>
            ) : (
              <>
                {/* Mood breakdown */}
                <div className="bg-card/40 border border-white/10 rounded-[2rem] p-6 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Mood Breakdown</h3>
                  {Object.entries(
                    moodLogs.reduce((acc: Record<string, number>, log) => {
                      acc[log.mood_id] = (acc[log.mood_id] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                    <div key={mood} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white uppercase">{mood}</span>
                        <span className="text-slate-400">{count} scans</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(count / moodLogs.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {moodLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 bg-card/40 border border-white/10 rounded-2xl p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 truncate">{log.user_key}</p>
                        <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-none font-black uppercase text-[10px]">{log.mood_id}</Badge>
                      <Badge className="bg-white/10 text-slate-300 border-none font-black uppercase text-[10px]">{log.detection_method}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Admin;
