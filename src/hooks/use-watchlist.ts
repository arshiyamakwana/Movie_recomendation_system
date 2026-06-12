import { useState, useEffect } from "react";
import { Movie } from "@/types/movie";
import { showSuccess } from "@/utils/toast";
import {
  fetchPersistedWatchlist,
  persistWatchlistItem,
  removePersistedWatchlistItem,
  submitRecommendationFeedback,
} from "@/services/userData";
import { auth } from "@/lib/firebase";

const LOCAL_WATCHLIST_KEY = "filmflix_watchlist";

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_WATCHLIST_KEY);
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }

    let alive = true;

    const loadPersisted = async () => {
      try {
        const remote = await fetchPersistedWatchlist();
        if (!alive) return;

        if (remote.length > 0) {
          setWatchlist(remote);
          localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(remote));
        }
      } catch (error) {
        console.warn("Falling back to local watchlist storage", error);
      }
    };

    loadPersisted();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) loadPersisted();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const toggleWatchlist = (movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.find((m) => m.id === movie.id);
      let next;
      if (exists) {
        next = prev.filter((m) => m.id !== movie.id);
        showSuccess(`Removed ${movie.title} from watchlist`);
        void removePersistedWatchlistItem(movie.id);
      } else {
        next = [...prev, movie];
        showSuccess(`Added ${movie.title} to watchlist`);
        void persistWatchlistItem(movie);
        void submitRecommendationFeedback({
          movieId: movie.id,
          recommendationSource: "watchlist",
          action: "save",
        });
      }
      localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isInWatchlist = (id: number) => watchlist.some((m) => m.id === id);

  return { watchlist, toggleWatchlist, isInWatchlist };
};
