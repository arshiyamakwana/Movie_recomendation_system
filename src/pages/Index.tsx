import { useEffect, useMemo, useState } from "react";
import { Movie } from "@/types/movie";
import {
  getContentRecommendations,
  fetchQueryRecommendations,
  fetchCustomMoodRecommendations,
  fetchMoodRecommendations,
  fetchPersonalizedHomeFeed,
  fetchRecentlyReleased,
  type MovieLanguage,
} from "@/services/tmdb";


import {
  tokenize, extractTopTerms, RawMovie,
  type TopTerm,
} from "@/services/contentRecommender";
import MovieCard from "@/components/MovieCard";
import MovieDialog from "@/components/MovieDialog";
import SearchBar from "@/components/SearchBar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import IntroAnimation from "@/components/IntroAnimation";
import { MovieGridSkeleton } from "@/components/MovieSkeleton";
import { Badge } from "@/components/ui/badge";
import {
  Bookmark, BrainCircuit, Sparkles, User, Home,
  Wand2, Loader2, Zap, FlaskConical, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { withDisplayMatchPercent } from "@/lib/mlDisplayMatch";
import MoviePlannerChat from "@/components/MoviePlannerChat";
import MoodDetector from "@/components/MoodDetector";
import { logMoodScan, fetchMoviesByMood, fetchAllMovies } from "@/services/userData";

const CINEMA_STORAGE_KEY = "filmflix-cinema-lang";

function readStoredCinema(): MovieLanguage {
  try {
    const v = localStorage.getItem(CINEMA_STORAGE_KEY);
    if (v === "all" || v === "hindi" || v === "hollywood") return v;
  } catch {
    /* ignore */
  }
  return "all";
}

const MOODS = [
  { id: "happy",    label: "Happy",    emoji: "😊", desc: "Feel-good, romance, uplifting films" },
  { id: "sad",      label: "Sad",      emoji: "😢", desc: "Emotional dramas, tearjerkers" },
  { id: "angry",    label: "Angry",    emoji: "😠", desc: "Action, revenge, intense thrillers" },
  { id: "surprise", label: "Surprise", emoji: "😮", desc: "Plot twists, sci-fi, mind-bending" },
  { id: "fear",     label: "Fear",     emoji: "😨", desc: "Horror, suspense, dark mystery" },
  { id: "disgust",  label: "Disgust",  emoji: "🤢", desc: "Gritty, dark, raw storytelling" },
  { id: "neutral",  label: "Neutral",  emoji: "😐", desc: "Anything goes, surprise me" },
];



const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[8px] font-black text-muted-foreground uppercase w-8 shrink-0">{label}</span>
    <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
    <span className="text-[8px] font-black shrink-0" style={{ color }}>{Math.round(value * 100)}</span>
  </div>
);

// ── ML Breakdown card overlay (shown below movie in AI results) ───────────────
const BreakdownCard = ({ movie }: { movie: Movie & { _breakdown?: { text: number; genre: number; rating: number; year: number } } }) => {
  if (!movie._breakdown) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-2.5 rounded-xl bg-card/80 border border-primary/20 backdrop-blur-md shadow-sm space-y-1"
    >
      <ScoreBar label="Plot"  value={movie._breakdown.text}   color="#9333ea" />
      <ScoreBar label="Genre" value={movie._breakdown.genre}  color="#c026d3" />
      <ScoreBar label="Rtng"  value={movie._breakdown.rating} color="#d97706" />
      <ScoreBar label="Era"   value={movie._breakdown.year}   color="#0891b2" />
    </motion.div>
  );
};

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recentlyReleased, setRecentlyReleased] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyLoading, setRecentlyLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchedMovie, setSearchedMovie] = useState<Movie | null>(null);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [cinemaLanguage, setCinemaLanguage] = useState<MovieLanguage>(readStoredCinema);
  const [activeTab, setActiveTab] = useState("home");
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CINEMA_STORAGE_KEY, cinemaLanguage);
    } catch {
    }
  }, [cinemaLanguage]);

  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<Movie[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [topTerms, setTopTerms] = useState<TopTerm[]>([]);

  const liveTokens = useMemo(() => {
    if (!aiQuery.trim()) return [];
    return tokenize(aiQuery).slice(0, 12);
  }, [aiQuery]);

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodResults, setMoodResults] = useState<Movie[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  const { watchlist } = useWatchlist();

  const moviesDisplay = useMemo(() => withDisplayMatchPercent(movies), [movies]);
  const recommendationsDisplay = useMemo(
    () => withDisplayMatchPercent(recommendations),
    [recommendations]
  );
  const aiResultsDisplay = useMemo(() => withDisplayMatchPercent(aiResults), [aiResults]);
  const moodResultsDisplay = useMemo(() => withDisplayMatchPercent(moodResults), [moodResults]);
  const recentlyReleasedDisplay = useMemo(() => withDisplayMatchPercent(recentlyReleased), [recentlyReleased]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAllMovies();
        if (!cancelled) setMovies(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [watchlist, feedRefresh, cinemaLanguage]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRecentlyLoading(true);
      try {
        const data = await fetchMoviesByMood("neutral");
        if (!cancelled) setRecentlyReleased(data.slice(0, 12));
      } finally {
        if (!cancelled) setRecentlyLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cinemaLanguage]);

  const handleMovieSelect = async (movie: Movie) => {
    setSearchedMovie(movie);
    setSelectedMovie(movie);
    setIsDialogOpen(true);
    setLoading(true);
    const recs = await getContentRecommendations(movie, movies, cinemaLanguage);
    setRecommendations(recs);
    setLoading(false);
    setActiveTab("home");
  };

  const openDetails = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDialogOpen(true);
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setShowBreakdown(false);
    setTopTerms([]);
    const results = await fetchQueryRecommendations(aiQuery, cinemaLanguage);
    setAiResults(results);
    // Extract top terms from query for display
    setTopTerms(extractTopTerms([aiQuery], 8));
    setAiLoading(false);
    setShowBreakdown(true);
  };

  const handleMoodSelect = async (moodId: string) => {
    if (selectedMood === moodId) { setSelectedMood(null); setMoodResults([]); return; }
    setSelectedMood(moodId);
    setMoodLoading(true);
    const results = await fetchMoviesByMood(moodId);
    setMoodResults(results);
    setMoodLoading(false);
  };

  const navItems = [
    { id: "home",      icon: Home,     label: "Home" },
    { id: "ai",        icon: Sparkles, label: "AI Discovery" },
    { id: "watchlist", icon: Bookmark, label: "Saved", count: watchlist.length },
  ];

  return (
    <div className="min-h-screen text-foreground selection:bg-primary selection:text-primary-foreground pb-32 md:pb-0 overflow-x-hidden">
      <IntroAnimation onComplete={() => setIntroComplete(true)} />

      <AnimatePresence>
        {introComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>

            {/* ── Nav ── */}
            <motion.nav
              initial={{ y: -100 }} animate={{ y: 0 }}
              className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-background/80 backdrop-blur-xl border-b border-foreground/8 shadow-sm"
            >
              <div className="flex items-center gap-12">
                <motion.h3
                  onClick={() => setActiveTab("home")} whileHover={{ scale: 1.05 }}
                  className="text-2xl font-black tracking-tighter text-foreground cursor-pointer"
                >
                  Film<span className="text-primary">Flix</span>
                </motion.h3>
                <div className="hidden md:flex items-center gap-8">
                  {navItems.map((item) => (
                    item.path ? (
                      <Link key={item.id} to={item.path}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:text-primary text-muted-foreground"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ) : (
                      <button key={item.id} onClick={() => setActiveTab(item.id)}
                        className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:text-primary",
                          activeTab === item.id ? "text-primary" : "text-muted-foreground")}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                        {item.count !== undefined && item.count > 0 && (
                          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md text-[8px]">{item.count}</span>
                        )}
                      </button>
                    )
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div
                  className="flex items-center rounded-2xl border border-foreground/10 bg-foreground/5 p-1 shadow-inner"
                  role="group"
                  aria-label="Movie region for search and ML"
                >
                  {(
                    [
                      { id: "all" as const, label: "All" },
                      { id: "hollywood" as const, label: "Hollywood" },
                      { id: "hindi" as const, label: "Bollywood" },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCinemaLanguage(c.id)}
                      className={cn(
                        "rounded-xl px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all",
                        cinemaLanguage === c.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <Link to="/profile">
                  <motion.button whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
                    className="p-3 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground hover:bg-primary/20 hover:border-primary/50 transition-all shadow-xl"
                  >
                    <User className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </motion.nav>

            {/* ── Hero ── */}
            {activeTab === "home" && (
              <div className="relative min-h-[60vh] md:h-[80vh] flex flex-col items-center justify-center px-4 overflow-hidden pt-24 md:pt-0 z-10">
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative mb-12 text-center"
                >
                  <h1 className="text-7xl md:text-[12rem] font-black tracking-tighter text-foreground drop-shadow-[0_0_60px_rgba(153,85,246,0.3)] select-none leading-none">
                    Film<span className="text-primary">Flix</span>
                  </h1>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary/60 mt-4">
                    The Future of Cinematic Discovery
                  </p>
                </motion.div>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-3xl mx-auto px-4 space-y-2">
                  <SearchBar onSelect={handleMovieSelect} language={cinemaLanguage} />
                  {cinemaLanguage === "hindi" && (
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                      Hindi / Bollywood — search & recommendations use TMDB Hindi + India region
                    </p>
                  )}
                  {cinemaLanguage === "hollywood" && (
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                      Hollywood — English originals + US region for providers
                    </p>
                  )}
                </motion.div>
              </div>
            )}

            <main className="max-w-7xl mx-auto px-4 pb-20 space-y-24 md:space-y-40 relative z-10">

              {/* ══════════════════════════════════════════════════════
                  AI DISCOVERY TAB
              ══════════════════════════════════════════════════════ */}
              {activeTab === "ai" && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-20 pt-32">

                  {/* ── TF-IDF Natural Language Search ── */}
                  <section className="space-y-10">
                    <div className="space-y-2">
                      <h2 className="text-4xl md:text-6xl font-black flex items-center gap-5 text-foreground tracking-tighter">
                        <Wand2 className="text-primary w-10 h-10" /> DESCRIBE IT
                      </h2>
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 text-primary/60" />
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          TF-IDF cosine similarity · query tokenized to {liveTokens.length > 0 ? liveTokens.length : "?"} terms
                        </p>
                      </div>
                    </div>

                    <div className="relative max-w-3xl space-y-3">
                      <textarea
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiQuery(); } }}
                        placeholder="e.g. a dark psychological thriller where reality and memory can't be trusted..."
                        rows={3}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/60 transition-all text-sm font-medium"
                      />

                      {/* Live token preview */}
                      <AnimatePresence>
                        {liveTokens.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-primary/5 border border-primary/15">
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest shrink-0">Tokenized →</span>
                              {liveTokens.map((tok, i) => (
                                <motion.span
                                  key={tok}
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                                >
                                  {tok}
                                </motion.span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Prompt chips */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          "heist crew planning the perfect crime",
                          "space exploration and survival against odds",
                          "coming of age friendship and self discovery",
                          "supernatural horror in an isolated location",
                        ].map((prompt) => (
                          <button key={prompt} onClick={() => setAiQuery(prompt)}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl bg-foreground/5 border border-foreground/10 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                          >{prompt}</button>
                        ))}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={handleAiQuery}
                        disabled={aiLoading || !aiQuery.trim()}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-primary/20"
                      >
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {aiLoading ? "Analysing..." : "Find Movies"}
                      </motion.button>
                    </div>

                    {/* Top matched terms */}
                    <AnimatePresence>
                      {topTerms.length > 0 && !aiLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="max-w-3xl p-4 rounded-2xl bg-foreground/3 border border-foreground/10 space-y-3"
                        >
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-primary" /> TF-IDF query weights
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {topTerms.map((t, i) => {
                              const pct = Math.round((t.score / topTerms[0].score) * 100);
                              const opacity = 0.4 + 0.6 * (pct / 100);
                              return (
                                <div key={t.term} className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-primary/20 bg-primary/5"
                                  style={{ opacity }}>
                                  <span className="text-[10px] font-black text-primary capitalize">{t.term}</span>
                                  <span className="text-[8px] text-muted-foreground font-bold">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {aiLoading && (
                        <motion.div key="aiskel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <MovieGridSkeleton count={12} />
                        </motion.div>
                      )}
                      {!aiLoading && aiResults.length > 0 && (
                        <motion.div key="airesults" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                              {aiResults.length} matches — ranked by cosine similarity
                            </p>
                            <button
                              onClick={() => setShowBreakdown(b => !b)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                                showBreakdown ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 border-foreground/10 text-muted-foreground hover:text-primary"
                              )}
                            >
                              {showBreakdown ? "Hide" : "Show"} Score Breakdown
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {aiResultsDisplay.map((movie, i) => (
                              <div key={movie.id} className="space-y-0">
                                <MovieCard cinemaLanguage={cinemaLanguage} movie={movie} onClick={openDetails} index={i} />
                                {showBreakdown && <BreakdownCard movie={movie as Movie & { _breakdown?: { text: number; genre: number; rating: number; year: number } }} />}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  <section className="space-y-12">
                    <div className="space-y-4">
                      <h2 className="text-4xl md:text-6xl font-black flex items-center gap-5 text-foreground tracking-tighter uppercase">
                        <Sparkles className="text-primary w-10 h-10" /> MOOD SPECTRUM
                      </h2>
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-2xl leading-relaxed">
                        Answer a few quick questions and we'll detect your vibe — then align the engine to your emotional state.
                      </p>
                    </div>

                    <MoodDetector
                      onMoodDetected={(moodId) => handleMoodSelect(moodId)}
                      onMoodEvent={({ moodId, method, detectedEmotion }) => {
                        void logMoodScan({
                          moodId,
                          detectionMethod: method,
                          detectedEmotion,
                        });
                      }}
                      onCustomMood={async (text) => {
                        setSelectedMood("custom");
                        setMoodLoading(true);
                        void logMoodScan({
                          moodId: "custom",
                          detectionMethod: "custom",
                          customPrompt: text,
                        });
                        const results = await fetchCustomMoodRecommendations(text, cinemaLanguage);
                        setMoodResults(results);
                        setMoodLoading(false);
                      }}
                      detectedMood={selectedMood}
                      onReset={() => { setSelectedMood(null); setMoodResults([]); }}
                    />

                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or pick manually</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {MOODS.map((mood) => (
                          <motion.button
                            key={mood.id}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMoodSelect(mood.id)}
                            className={cn(
                              "p-6 rounded-[2rem] border transition-all text-left space-y-3 relative overflow-hidden group",
                              selectedMood === mood.id
                                ? "bg-primary border-primary shadow-xl shadow-primary/20"
                                : "bg-card/40 border-white/10 hover:border-primary/40"
                            )}
                          >
                            <span className="text-3xl block">{mood.emoji}</span>
                            <div>
                              <p className={cn(
                                "text-xs font-black uppercase tracking-tight",
                                selectedMood === mood.id ? "text-white" : "text-foreground"
                              )}>{mood.label}</p>
                              <p className={cn(
                                "text-[8px] font-medium leading-tight mt-1",
                                selectedMood === mood.id ? "text-white/80" : "text-slate-500"
                              )}>{mood.desc}</p>
                            </div>
                            {selectedMood === mood.id && (
                              <motion.div layoutId="mood-active" className="absolute top-4 right-4">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {moodLoading ? (
                        <motion.div key="moodskel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <MovieGridSkeleton count={12} />
                        </motion.div>
                      ) : moodResults.length > 0 && (
                        <motion.div
                          key="moodresults"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-8"
                        >
                          {selectedMood === "sad" && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-[2rem] border border-blue-500/20 bg-blue-500/5 px-8 py-6 flex items-start gap-5"
                            >
                              <span className="text-4xl">🫂</span>
                              <div className="space-y-1">
                                <p className="text-white font-black text-sm uppercase tracking-widest">Hey, it's okay to feel sad.</p>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                                  Sometimes you just need to sit with it. We picked films that'll make you feel seen —
                                  cry it out, feel deeply, and remember you're not alone. Better days are coming. 💙
                                </p>
                              </div>
                            </motion.div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {moodResultsDisplay.map((movie, i) => (
                              <MovieCard cinemaLanguage={cinemaLanguage} key={movie.id} movie={movie} onClick={openDetails} index={i} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                </motion.div>
              )}

           
              {activeTab === "watchlist" && (
                <motion.section
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-12 pt-32"
                >
                  <div className="flex items-end justify-between border-b border-foreground/10 pb-8">
                    <h2 className="text-4xl md:text-6xl font-black flex items-center gap-6 text-foreground tracking-tighter">
                      <Bookmark className="text-primary w-12 h-12" /> COLLECTION
                    </h2>
                  </div>
                  {watchlist.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                      {watchlist.map((movie, i) => <MovieCard cinemaLanguage={cinemaLanguage} key={movie.id} movie={movie} onClick={openDetails} index={i} />)}
                    </div>
                  ) : (
                    <div className="text-center py-32 space-y-6">
                      <Bookmark className="w-20 h-20 text-muted-foreground mx-auto opacity-10" />
                      <p className="text-muted-foreground text-xl font-bold">Your vault is empty</p>
                    </div>
                  )}
                </motion.section>
              )}

              
              {activeTab === "home" && (
                <>
                  <motion.section 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-foreground/10 pb-8">
                      <div className="space-y-2">
                        <h2 className="text-4xl md:text-6xl font-black flex items-center gap-5 text-foreground tracking-tighter uppercase">
                          <Sparkles className="text-primary w-10 h-10" /> Recently Released
                        </h2>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-primary/60" />
                          <p className="text-muted-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest">
                            Newest arrivals in {cinemaLanguage === "all" ? "global cinema" : cinemaLanguage === "hindi" ? "Bollywood" : "Hollywood"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {recentlyLoading ? (
                        <motion.div key="recently-skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <MovieGridSkeleton count={12} />
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="recently-results"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8"
                        >
                          {recentlyReleasedDisplay.map((movie, i) => (
                            <MovieCard 
                              cinemaLanguage={cinemaLanguage} 
                              key={movie.id} 
                              movie={movie} 
                              onClick={openDetails} 
                              index={i} 
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>

           
                  <AnimatePresence mode="wait">
                    {recommendations.length > 0 && (
                      <motion.section
                        key="recommendations"
                        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="space-y-12"
                      >
                        <div className="flex items-end justify-between border-b border-foreground/10 pb-8">
                          <div className="space-y-2">
                            <h2 className="text-4xl md:text-6xl font-black flex items-center gap-6 text-foreground tracking-tighter">
                              <BrainCircuit className="text-primary w-12 h-12" /> AI PICKS
                            </h2>
                            <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">
                              TF-IDF + Jaccard match for <span className="text-primary">"{searchedMovie?.title}"</span>
                            </p>
                          </div>
                        </div>
                        {loading ? <MovieGridSkeleton /> : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {recommendationsDisplay.map((movie, i) => (
                              <div key={movie.id}>
                                <MovieCard cinemaLanguage={cinemaLanguage} movie={movie} onClick={openDetails} index={i} />
                                <BreakdownCard movie={movie as Movie & { _breakdown?: { text: number; genre: number; rating: number; year: number } }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.section>
                    )}
                  </AnimatePresence>

                  <motion.section
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className="space-y-10"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-foreground/10 pb-8 min-w-0">
                      <div className="space-y-4 min-w-0 flex-1">
                        <h2 className="text-4xl md:text-6xl font-black flex flex-wrap items-center gap-4 md:gap-6 text-foreground tracking-tighter uppercase">
                          <BrainCircuit className="text-primary w-10 h-10 md:w-12 md:h-12 shrink-0" />
                          <span>For You</span>
                        </h2>
                        
                        {watchlist.length >= 1 ? (
                          <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
                            Personalized feed active: Your "Taste DNA" is currently being used to re-rank the global catalog.
                            Matches are calculated via <span className="text-primary">cosine similarity</span> across 10,000+ vector dimensions.
                          </p>
                        ) : (
                          <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] max-w-3xl leading-relaxed">
                            Cold-start mode: We're using broad TF-IDF semantic discovery until you add saves. 
                            Start saving movies to unlock your <span className="text-primary">Taste Profile</span>.
                          </p>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setFeedRefresh((n) => n + 1)}
                        disabled={loading}
                        className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-foreground/5 border border-foreground/15 text-foreground font-black text-[10px] uppercase tracking-widest hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-primary" />
                        )}
                        Refresh pool
                      </motion.button>
                    </div>
                    {loading ? (
                      <MovieGridSkeleton count={12} />
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {moviesDisplay.map((movie, i) => (
                          <MovieCard cinemaLanguage={cinemaLanguage} key={movie.id} movie={movie} onClick={openDetails} index={i} />
                        ))}
                      </div>
                    )}
                  </motion.section>
                </>
              )}
            </main>

            <MovieDialog
              movie={selectedMovie}
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              cinemaLanguage={cinemaLanguage}
            />
            <MoviePlannerChat
              watchlist={watchlist}
              onSelectMovie={openDetails}
              cinemaLanguage={cinemaLanguage}
            />
            <MobileNav activeTab={activeTab} onTabChange={setActiveTab} watchlistCount={watchlist.length} />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
