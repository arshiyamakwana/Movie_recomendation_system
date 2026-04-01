"use client";

import React, { useState, useEffect, useRef } from "react";
import { Movie } from "@/types/movie";
import { getImageUrl, getMovieTrailer, getMovieDetails, type MovieLanguage } from "@/services/tmdb";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Volume2, VolumeX, PlayCircle, Bookmark, Check, Loader2, Zap, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import SubscriptionModal from "./SubscriptionModal";

interface MovieCardProps {
  movie: Movie & { _displayMatchPercent?: number; _reason?: string };
  onClick: (movie: Movie) => void;
  index?: number;
  cinemaLanguage?: string;
}

const MovieCard = ({ movie, onClick, index = 0, cinemaLanguage = "all" }: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [watchLink, setWatchLink] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  const inWatchlist = isInWatchlist(movie.id);
  const matchPercent = movie._displayMatchPercent;
  const isNeuralMatch = matchPercent && matchPercent > 85;

  useEffect(() => {
    if (isHovered && !isMobile) {
      hoverTimerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const [key, details] = await Promise.all([
            trailerKey ? Promise.resolve(trailerKey) : getMovieTrailer(movie.id),
            watchLink ? Promise.resolve({ watch_link: watchLink }) : getMovieDetails(movie.id, cinemaLanguage)
          ]);
          
          if (key) {
            setTrailerKey(key);
            setShowTrailer(true);
          }
          if (details?.watch_link) setWatchLink(details.watch_link);
        } catch (error) {
          console.error("Failed to load trailer preview:", error);
        } finally {
          setIsLoading(false);
        }
      }, 500); // Slightly faster trigger
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setShowTrailer(false);
      setIsLoading(false);
    }
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, [isHovered, movie.id, trailerKey, watchLink, isMobile]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(movie);
  };

  const handleWatchNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubscriptionOpen(true);
  };

  return (
    <>
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        movieTitle={movie.title}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.1 }}
      whileHover={!isMobile ? { scale: 1.05, y: -12, zIndex: 40 } : {}}
      whileTap={{ scale: 0.95 }}
      className="relative group cursor-pointer rounded-2xl overflow-hidden bg-card shadow-2xl"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={() => onClick(movie)}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        {/* Main Poster Image */}
        <motion.img
          src={getImageUrl(movie.poster_path)}
          alt={movie.title}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            showTrailer ? "scale-110 blur-md opacity-30" : "group-hover:scale-110",
            isMobile && "opacity-70"
          )}
        />

        {/* Loading Indicator for Trailer */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match Badge */}
          {matchPercent !== undefined && (
            <div className={cn(
              "absolute left-3 top-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider backdrop-blur-md shadow-lg transition-transform group-hover:scale-110",
              isNeuralMatch 
                ? "bg-primary text-primary-foreground border border-white/20" 
                : "bg-black/60 text-white border border-white/10"
            )}>
              {isNeuralMatch ? (
                <Brain className="w-3 h-3 animate-pulse" />
              ) : (
                <Zap className="w-3 h-3 text-primary" />
              )}
              {matchPercent}%
            </div>
          )}

          {/* Persona Match Label */}
          {isNeuralMatch && movie._reason && (
            <div className="absolute top-12 left-3 z-40 max-w-[140px]">
              <span className="bg-blue-500/90 text-white text-[7px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md backdrop-blur-sm border border-white/10 shadow-lg block truncate">
                {movie._reason}
              </span>
            </div>
          )}

          {/* Poster Image */}
        <button
          onClick={handleSave}
          className={cn(
            "absolute top-3 right-3 z-40 p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300",
            inWatchlist
              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-white/85 border-foreground/15 text-foreground hover:bg-primary/10",
            !isMobile && "opacity-0 group-hover:opacity-100"
          )}
        >
          {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Trailer Preview Iframe */}
        <AnimatePresence>
          {showTrailer && trailerKey && !isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 pointer-events-none"
            >
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <iframe
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400%] h-[150%] scale-110"
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerKey}&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&showinfo=0&playsinline=1`}
                  title="Trailer Preview"
                  allow="autoplay; encrypted-media"
                />
              </div>
              
              {/* Mute Toggle */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="absolute top-3 left-3 z-40 p-2 bg-black/60 backdrop-blur-xl rounded-full hover:bg-primary transition-all border border-white/10 pointer-events-auto"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay Info */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-all duration-500 flex flex-col justify-end p-5 z-20",
          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <motion.div 
            initial={false}
            animate={isHovered || isMobile ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground border-none font-black px-2 py-0.5 text-[10px]">
                <Star className="w-3 h-3 fill-current mr-1" />
                {movie.vote_average.toFixed(1)}
              </Badge>
              {movie._reason ? (
                <span className="text-[9px] text-primary/90 font-black uppercase tracking-widest bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5">
                  {movie._reason}
                </span>
              ) : (
                <span className="text-[10px] text-white/80 font-bold tracking-widest">{movie.release_date?.split("-")[0]}</span>
              )}
            </div>
            
            <h3 className="text-white font-black text-base line-clamp-2 leading-tight uppercase tracking-tighter">
              {movie.title}
            </h3>
            
            <button 
              onClick={handleWatchNow}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              <PlayCircle className="w-4 h-4" />
              Watch Now
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  </>
);
};

export default MovieCard;