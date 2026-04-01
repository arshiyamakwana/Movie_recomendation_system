import { useState, useEffect } from "react";
import { Movie } from "@/types/movie";
import { showSuccess } from "@/utils/toast";

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("filmflix_watchlist");
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  const toggleWatchlist = (movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.find((m) => m.id === movie.id);
      let next;
      if (exists) {
        next = prev.filter((m) => m.id !== movie.id);
        showSuccess(`Removed ${movie.title} from watchlist`);
      } else {
        next = [...prev, movie];
        showSuccess(`Added ${movie.title} to watchlist`);
      }
      localStorage.setItem("filmflix_watchlist", JSON.stringify(next));
      return next;
    });
  };

  const isInWatchlist = (id: number) => watchlist.some((m) => m.id === id);

  return { watchlist, toggleWatchlist, isInWatchlist };
};