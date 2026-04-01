import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Movie } from "@/types/movie";
import { searchMovies, getImageUrl, type MovieLanguage } from "@/services/tmdb";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  onSelect: (movie: Movie) => void;
  /** Filter search to All / Hindi (Bollywood) / English (Hollywood) */
  language?: MovieLanguage;
}

const SearchBar = ({ onSelect, language = "all" }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        setLoading(true);
        const data = await searchMovies(query, language);
        setResults(data.slice(0, 6));
        setLoading(false);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, language]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a movie you love..."
          className="pl-12 pr-12 h-14 bg-background/80 backdrop-blur-xl border-2 border-muted focus-visible:ring-primary rounded-2xl text-lg shadow-2xl transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-2xl border border-muted rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2">
              {results.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => {
                    onSelect(movie);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-4 p-3 hover:bg-primary/10 rounded-xl transition-colors text-left group"
                >
                  <img
                    src={getImageUrl(movie.poster_path)}
                    className="w-12 h-18 object-cover rounded-lg shadow-md"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                      {movie.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {movie.release_date?.split("-")[0]} • {movie.vote_average.toFixed(1)} Rating
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;