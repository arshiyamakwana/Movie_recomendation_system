import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Movie } from "@/types/movie";
import { getMovieDetails, getImageUrl, getRecommendations, type MovieLanguage } from "@/services/tmdb";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Star, Plus, Check, Tv, Users, Film, Play, BrainCircuit, Scan, Activity, Database, Fingerprint, Zap } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";
import { motion, AnimatePresence } from "framer-motion";
import SubscriptionModal from "./SubscriptionModal";
import { detectEmotions, getMovieInsights } from "@/services/contentRecommender";
import { cn } from "@/lib/utils";

// ── Neural Scanner Component ────────────────────────────────────────────────
const NeuralScanner = ({ movieTitle }: { movieTitle: string }) => {
  const [scanStatus, setScanStatus] = useState("Initializing Neural Uplink...");
  const [progress, setScanProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const statuses = [
      "Accessing TMDB Production Nodes...",
      "Extracting Script Semantics...",
      "Analyzing Visual Metadata...",
      "Decoding Emotional Resonance...",
      "Finalizing Neural Match..."
    ];
    
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < statuses.length) {
        setScanStatus(statuses[currentIdx]);
        setScanProgress((prev) => prev + 20);
        currentIdx++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  if (isComplete) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative mb-8">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Scan className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <motion.div 
          initial={{ y: -40 }} 
          animate={{ y: 40 }} 
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-x-0 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
      </div>
      
      <div className="space-y-2 max-w-xs">
        <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Neural Analysis In Progress</h3>
        <p className="text-primary font-mono text-[10px] h-4">{scanStatus}</p>
        <div className="w-48 h-1 bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            className="h-full bg-primary" 
          />
        </div>
      </div>
      
      <div className="absolute bottom-8 flex gap-8 opacity-20">
        <Database className="w-4 h-4 text-white" />
        <Activity className="w-4 h-4 text-white" />
        <Fingerprint className="w-4 h-4 text-white" />
      </div>
    </motion.div>
  );
};

interface MovieDialogProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  cinemaLanguage?: MovieLanguage;
}

const MovieDialog = ({ movie, isOpen, onClose, cinemaLanguage = "all" }: MovieDialogProps) => {
  const [details, setDetails] = useState<Movie | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [emotions, setEmotions] = useState<{ emotions: Record<string, number>; triggerWords: string[] } | null>(null);
  const [insights, setInsights] = useState<ReturnType<typeof getMovieInsights> | null>(null);
  const [visualAnalysis, setVisualAnalysis] = useState<{ palette: string[]; pacing: string; range: string } | null>(null);
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  useEffect(() => {
    if (movie && isOpen) {
      setLoading(true);
      setEmotions(detectEmotions(movie.overview || ""));
      setInsights(getMovieInsights(movie.overview || ""));
      
      // Simulate visual metadata analysis
      setTimeout(() => {
        setVisualAnalysis({
          palette: ["#0f172a", "#1e293b", "#334155", "#475569"],
          pacing: movie.vote_average > 7.5 ? "Slow-Burn / Cinematic" : "Dynamic / High-Octane",
          range: "Ultra-High Dynamic (HDR10+)"
        });
      }, 3000);

      Promise.all([
        getMovieDetails(movie.id, cinemaLanguage),
        getRecommendations(movie.id)
      ]).then(([detailsData, similarData]) => {
        setDetails(detailsData);
        setSimilar(similarData.slice(0, 4));
        setLoading(false);
      });
    }
  }, [movie, isOpen, cinemaLanguage]);

  if (!movie) return null;

  const inWatchlist = isInWatchlist(movie.id);

  const handleWatchNow = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubscriptionOpen(true);
  };

  return (
    <React.Fragment>
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        movieTitle={movie.title}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-none shadow-2xl h-[90vh] md:h-auto">
          <NeuralScanner movieTitle={movie.title} />
          <ScrollArea className="h-full max-h-[90vh]">
            <div className="relative aspect-video w-full bg-muted group">
              {details?.trailer_key ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${details.trailer_key}?autoplay=1&mute=0&rel=0&modestbranding=1`}
                  title="Trailer"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={getImageUrl(movie.backdrop_path, "original")}
                    className="w-full h-full object-cover opacity-60"
                    alt={movie.title}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Film className="w-12 h-12 text-white/20 mx-auto" />
                      <p className="text-white/40 text-sm font-medium">Trailer not available</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="p-6 md:p-8 -mt-12 md:-mt-20 relative z-10">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="hidden md:block w-48 shrink-0">
                  <motion.img
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    src={getImageUrl(movie.poster_path)}
                    className="w-full rounded-xl shadow-2xl border-4 border-background"
                    alt={movie.title}
                  />
                  
                  {details?.providers && details.providers.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Available On</h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        {details.providers.map((p) => (
                          <img 
                            key={p.provider_id} 
                            src={getImageUrl(p.logo_path, "w92")} 
                            className="w-8 h-8 rounded-lg shadow-lg border border-foreground/10"
                            title={p.provider_name}
                            alt={p.provider_name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {details?.watch_link && (
                    <Button 
                      className="w-full mt-6 gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
                      onClick={handleWatchNow}
                    >
                      <Tv className="w-4 h-4" />
                      Watch Now
                    </Button>
                  )}
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <DialogHeader>
                        <DialogTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                          {movie.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-wrap gap-3 items-center text-xs md:text-sm text-muted-foreground">
                        <Badge variant="outline" className="flex gap-1 items-center border-primary/20 text-primary font-bold">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          {movie.vote_average.toFixed(1)}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {movie.release_date?.split("-")[0]}
                        </span>
                        {details?.runtime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {details.runtime} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={inWatchlist ? "secondary" : "outline"}
                        size="icon"
                        className="rounded-full shrink-0 border-primary/20"
                        onClick={() => toggleWatchlist(movie)}
                      >
                        {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {details?.genres?.map((g) => (
                      <Badge key={g} variant="secondary" className="rounded-full px-4 bg-primary/10 hover:bg-primary/20 text-primary border-none text-[10px] md:text-xs">
                        {g}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Overview</h4>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{movie.overview}</p>
                  </div>

                  {emotions && (
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" /> Neural Emotion Analysis
                        </h4>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Sentiment Extraction</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(emotions.emotions).map(([emotion, score]) => (
                          <div key={emotion} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">{emotion}</span>
                              <span className="text-[9px] font-black text-primary">{(score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${score * 100}%` }}
                                className={cn(
                                  "h-full rounded-full",
                                  emotion === 'joy' ? 'bg-emerald-400' :
                                  emotion === 'fear' ? 'bg-purple-500' :
                                  emotion === 'sadness' ? 'bg-blue-400' :
                                  emotion === 'surprise' ? 'bg-amber-400' : 'bg-rose-500'
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {emotions.triggerWords.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-1 self-center">Trigger Tokens:</span>
                          {emotions.triggerWords.map((word) => (
                            <span key={word} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-slate-300 lowercase italic">
                              "{word}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}



                  {visualAnalysis && (
                    <div className="p-5 rounded-2xl bg-slate-900/30 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Visual Spectrum Analysis
                        </h4>
                        <Badge variant="outline" className="text-[8px] border-white/10 text-slate-500">Frame-by-Frame Metadata</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold text-slate-500 uppercase">Master Palette</p>
                          <div className="flex gap-1.5">
                            {visualAnalysis.palette.map((color, i) => (
                              <div key={i} className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold text-slate-500 uppercase">Pacing Signature</p>
                          <p className="text-[10px] font-black text-white uppercase tracking-wider">{visualAnalysis.pacing}</p>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Dynamic Range: <span className="text-white">{visualAnalysis.range}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {details?.cast && details.cast.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Users className="w-4 h-4" /> Top Cast
                      </h4>
                      <ScrollArea className="w-full whitespace-nowrap pb-4">
                        <div className="flex gap-4">
                          {details.cast.map((person) => (
                            <div key={person.name} className="w-24 shrink-0 space-y-2">
                              <img 
                                src={getImageUrl(person.profile_path, "w185")} 
                                className="w-24 h-24 object-cover rounded-full border-2 border-foreground/10 shadow-xl"
                                alt={person.name}
                              />
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-foreground truncate">{person.name}</p>
                                <p className="text-[8px] text-muted-foreground truncate">{person.character}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  )}

                  {similar.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Film className="w-4 h-4" /> Similar Titles
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        {similar.map((m) => (
                          <div key={m.id} className="space-y-1 group cursor-pointer" onClick={() => setDetails(null)}>
                            <img 
                              src={getImageUrl(m.poster_path, "w92")} 
                              className="w-full aspect-[2/3] object-cover rounded-lg border border-foreground/10 group-hover:border-primary/50 transition-colors"
                              alt=""
                            />
                            <p className="text-[10px] font-bold truncate text-muted-foreground group-hover:text-primary transition-colors">
                              {m.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default MovieDialog;