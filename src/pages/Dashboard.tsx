"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell,
} from "recharts";
import { User, Zap, Clock, Star, TrendingUp, Bookmark, Brain, Dna, Cpu, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWatchlist } from "@/hooks/use-watchlist";
import { auth } from "@/lib/firebase";
import {
  kMeansCluster, extractTopTerms, computeGenreAffinity, collaborativeFilter,
  TasteCluster, TopTerm, GenreAffinity, CollabResult,
} from "@/services/contentRecommender";
import { fetchTrending } from "@/services/tmdb";
import { Movie } from "@/types/movie";

// ── Activity tracking ─────────────────────────────────────────────────────────
function recordTodayActivity() {
  const stored = JSON.parse(localStorage.getItem("filmflix_activity") || "{}");
  const today = new Date().toISOString().slice(0, 10);
  stored[today] = (stored[today] || 0) + 1;
  localStorage.setItem("filmflix_activity", JSON.stringify(stored));
  return stored;
}
function getActivityData() {
  const stored = JSON.parse(localStorage.getItem("filmflix_activity") || "{}");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), count: stored[key] || 0 };
  });
}

// ── Cosine angle tooltip ──────────────────────────────────────────────────────
const ScoreFill = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ backgroundColor: color }} className="h-full rounded-full"
      />
    </div>
    <span className="text-[10px] font-black" style={{ color }}>{Math.round(value * 100)}%</span>
  </div>
);

const Dashboard = () => {
  const { watchlist } = useWatchlist();
  const [userName, setUserName] = useState("Cinephile");
  const [activityData, setActivityData] = useState(getActivityData());
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [pool, setPool] = useState<Movie[]>([]);
  const [clusters, setClusters] = useState<TasteCluster[]>([]);
  const [topTerms, setTopTerms] = useState<TopTerm[]>([]);
  const [affinity, setAffinity] = useState<GenreAffinity[]>([]);
  const [collab, setCollab] = useState<CollabResult | null>(null);
  const [mlReady, setMlReady] = useState(false);

  useEffect(() => {
    recordTodayActivity();
    setActivityData(getActivityData());
    const unsub = auth.onAuthStateChanged(u => { if (u?.displayName) setUserName(u.displayName); });
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    fetchTrending().then(setPool);
    return () => { unsub(); clearInterval(timer); };
  }, [sessionStart]);

  // Run ML analysis when watchlist or pool changes
  useEffect(() => {
    if (watchlist.length === 0) { setMlReady(false); return; }
    // K-Means (run in a microtask to not block UI)
    const t = setTimeout(() => {
      const k = Math.min(3, Math.ceil(watchlist.length / 2));
      setClusters(kMeansCluster(watchlist as any, k));
      setTopTerms(extractTopTerms(watchlist.map(m => m.overview || "")));
      setAffinity(computeGenreAffinity(watchlist as any));
      if (pool.length > 0) setCollab(collaborativeFilter(watchlist as any, pool as any));
      setMlReady(true);
    }, 100);
    return () => clearTimeout(t);
  }, [watchlist, pool]);

  // Genre pie from watchlist
  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    const GENRE_MAP: Record<number, string> = {28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",9648:"Mystery",10749:"Romance",878:"Sci-Fi",53:"Thriller"};
    watchlist.forEach(m => (m.genre_ids || []).forEach((id: number) => {
      if (GENRE_MAP[id]) counts[GENRE_MAP[id]] = (counts[GENRE_MAP[id]] || 0) + 1;
    }));
    const COLORS = ["#9333ea","#c026d3","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777"];
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6)
      .map(([name,value],i)=>({name,value,color:COLORS[i%COLORS.length]}));
  }, [watchlist]);

  const avgRating = watchlist.length ? (watchlist.reduce((s,m)=>s+m.vote_average,0)/watchlist.length).toFixed(1) : "—";
  const estimatedHours = Math.round(watchlist.length * 1.8);
  const formatElapsed = (s: number) => { const m=Math.floor(s/60); return m>0 ? `${m}m ${s%60}s` : `${s}s`; };

  const radarData = affinity.slice(0, 6).map(g => ({ genre: g.name, value: Math.round(g.affinity * 100) }));

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-fuchsia-500 p-1">
              <div className="w-full h-full rounded-[1.4rem] bg-background flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-background rounded-full" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">{userName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-black">CINEPHILE</Badge>
              {mlReady && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-400/30 text-[10px] font-black">ML ACTIVE</Badge>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex gap-4">
          {[
            { label: "Saved", value: watchlist.length },
            { label: "Session", value: formatElapsed(elapsed) },
          ].map(s => (
            <div key={s.label} className="bg-foreground/5 backdrop-blur-xl border border-foreground/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[110px]">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <span className="text-2xl font-black text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Session Time",    value: formatElapsed(elapsed), icon: Clock,       color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Avg Rating",      value: avgRating,              icon: Star,        color: "text-amber-500",  bg: "bg-amber-500/10" },
          { label: "Est. Watch Time", value: `${estimatedHours}h`,   icon: Zap,         color: "text-fuchsia-500",bg: "bg-fuchsia-500/10" },
          { label: "ML Clusters",     value: mlReady ? clusters.length : "—", icon: Brain, color: "text-cyan-500",bg: "bg-cyan-500/10" },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-xl border border-foreground/10 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-foreground">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Activity + Genre Pie ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(265,20%,88%)" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(255,10%,55%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(255,10%,55%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor:"hsl(270,30%,98%)", border:"1px solid hsl(265,20%,88%)", borderRadius:"12px" }} itemStyle={{ color:"hsl(265,90%,60%)" }} />
                <Bar dataKey="count" fill="hsl(265,90%,60%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Dna className="w-4 h-4" /> Genre DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] flex flex-col items-center justify-center">
            {genreData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={genreData} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {genreData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor:"hsl(270,30%,98%)", border:"1px solid hsl(265,20%,88%)", borderRadius:"10px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {genreData.slice(0, 4).map(g => (
                    <span key={g.name} className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />{g.name}
                    </span>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center">Save movies to see your Genre DNA</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── ML Section Header ── */}
      <div className="flex items-center gap-4 pt-4">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <Cpu className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">ML Analysis Engine</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            TF-IDF · Cosine Similarity · K-Means · Collaborative Filtering
          </p>
        </div>
        {!mlReady && watchlist.length === 0 && (
          <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-400/30 text-[10px]">
            Save movies to activate ML
          </Badge>
        )}
      </div>

      {/* ── K-Means Taste Clusters ── */}
      {mlReady && clusters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            K-Means Clustering — {clusters.length} Taste Groups Detected
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {clusters.map((cluster, ci) => (
              <motion.div key={ci} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}
                className="bg-white/80 border border-foreground/10 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cluster.color }} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cluster {ci + 1}</span>
                    </div>
                    <h4 className="text-base font-black text-foreground leading-tight">{cluster.personality}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cluster.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-foreground">{cluster.movies.length}</p>
                    <p className="text-[9px] text-muted-foreground">films</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Cluster cohesion</span>
                    <span style={{ color: cluster.color }}>{Math.round((cluster.movies.length / watchlist.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((cluster.movies.length / watchlist.length) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ backgroundColor: cluster.color }} className="h-full rounded-full" />
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {cluster.movies.slice(0, 5).map(m => (
                    <img key={m.id} src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                      className="w-10 h-14 object-cover rounded-lg shrink-0 border border-foreground/10" alt={m.title} />
                  ))}
                  {cluster.movies.length > 5 && (
                    <div className="w-10 h-14 rounded-lg bg-foreground/5 border border-foreground/10 flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0">
                      +{cluster.movies.length - 5}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-foreground">{cluster.avgRating}</span>
                  <span className="text-[10px] text-muted-foreground">avg rating</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Genre Affinity Radar + Collab Filtering ── */}
      {mlReady && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Radar chart */}
          <Card className="bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Genre Affinity Radar
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium">
                Computed from genre frequency in your watchlist
              </p>
            </CardHeader>
            <CardContent className="h-[260px]">
              {radarData.length >= 3 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(265,20%,88%)" />
                    <PolarAngleAxis dataKey="genre" tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(255,10%,55%)" }} />
                    <Radar dataKey="value" stroke="hsl(265,90%,60%)" fill="hsl(265,90%,60%)" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ backgroundColor:"hsl(270,30%,98%)", border:"1px solid hsl(265,20%,88%)", borderRadius:"10px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Save at least 3 movies across different genres</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborative filtering persona */}
          <Card className="bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Brain className="w-4 h-4" /> Collaborative Filtering
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium">
                Jaccard similarity against archetypal viewer personas
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {collab ? (
                <>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Closest Persona</p>
                    <p className="text-xl font-black text-foreground">{collab.closestPersona.name}</p>
                    <p className="text-xs text-muted-foreground">{collab.closestPersona.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase">Similarity</span>
                      <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(collab.similarity * 100)}%` }}
                          transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
                      </div>
                      <span className="text-[11px] font-black text-primary">{Math.round(collab.similarity * 100)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">CF Top Picks for You</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {collab.recommendations.slice(0, 6).map(m => (
                        <div key={m.id} className="shrink-0 space-y-1">
                          <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                            className="w-12 h-16 object-cover rounded-lg border border-foreground/10" alt={m.title} />
                          <p className="text-[8px] font-bold text-muted-foreground truncate w-12">{m.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Save movies to activate collaborative filtering</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TF-IDF Top Terms ── */}
      {mlReady && topTerms.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Cpu className="w-4 h-4" /> TF-IDF Taste Vocabulary
            </CardTitle>
            <p className="text-[10px] text-muted-foreground font-medium">
              Top terms extracted from your watchlist overviews — higher weight = stronger signal
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topTerms.slice(0, 10).map((t, i) => {
                const pct = Math.round((t.score / topTerms[0].score) * 100);
                const COLS = ["#9333ea","#c026d3","#7c3aed","#0891b2","#059669","#d97706","#dc2626","#db2777","#6d28d9","#0e7490"];
                return (
                  <div key={t.term} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-muted-foreground w-4 text-right">{i + 1}</span>
                    <span className="text-[11px] font-black text-foreground w-28 truncate capitalize">{t.term}</span>
                    <div className="flex-1 h-2 bg-foreground/8 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                        style={{ backgroundColor: COLS[i] }} className="h-full rounded-full" />
                    </div>
                    <span className="text-[10px] font-black" style={{ color: COLS[i] }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recently Saved ── */}
      {watchlist.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-3xl border-foreground/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Recently Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {watchlist.slice(0, 12).map(m => (
                <div key={m.id} className="shrink-0 w-20 space-y-1.5">
                  <img src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                    className="w-20 h-28 object-cover rounded-xl border border-foreground/10 shadow-sm" alt={m.title} />
                  <p className="text-[9px] font-bold text-muted-foreground truncate">{m.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
