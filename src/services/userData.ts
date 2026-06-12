import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { getAppUserKey } from "@/lib/appUser";
import type { Movie } from "@/types/movie";

export type MoodDetectionMethod = "camera" | "quiz" | "manual" | "custom";

export interface RecommendationFeedbackInput {
  movieId: number;
  recommendationSource: string;
  action: "click" | "save" | "dismiss" | "like" | "dislike";
  moodId?: string | null;
}

function serializeMovie(movie: Movie) {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    overview: movie.overview,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    genre_ids: movie.genre_ids ?? [],
  };
}

// Map mood IDs to mood_tags stored in Supabase
const MOOD_TAG_MAP: Record<string, string[]> = {
  happy:          ["happy", "heartwarming", "chill"],
  sad:            ["sad"],
  angry:          ["adrenaline", "epic"],
  surprise:       ["mind-bending", "epic"],
  fear:           ["spooky", "fear"],
  disgust:        ["spooky"],
  neutral:        ["chill", "epic", "mind-bending"],
  heartwarming:   ["heartwarming", "happy"],
  adrenaline:     ["adrenaline", "epic"],
  chill:          ["chill", "happy"],
  spooky:         ["spooky", "fear"],
  "mind-bending": ["mind-bending"],
};

export async function fetchAllMovies(): Promise<Movie[]> {
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .order("vote_average", { ascending: false });

  if (error || !data) return [];

  const seen = new Set<number>();
  return data.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  }).map((m) => ({
    id: m.id,
    title: m.title,
    overview: m.overview || "",
    poster_path: m.poster_url || "",
    backdrop_path: m.poster_url || "",
    release_date: m.release_date || "",
    vote_average: m.vote_average || 0,
    genre_ids: [],
    is_premium: m.is_premium || false,
    trailer_url: m.trailer_url || "",
    stream_url: m.stream_url || "",
  })) as Movie[];
}

export async function fetchMoviesByMood(moodId: string): Promise<Movie[]> {
  const tags = MOOD_TAG_MAP[moodId] || [moodId];

  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .overlaps("mood_tags", tags)
    .order("vote_average", { ascending: false });

  if (error || !data || data.length === 0) return [];

  // Remove duplicates by id
  const seen = new Set<number>();
  const unique = data.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return unique.map((m) => ({
    id: m.id,
    title: m.title,
    overview: m.overview || "",
    poster_path: m.poster_url || "",
    backdrop_path: m.poster_url || "",
    release_date: m.release_date || "",
    vote_average: m.vote_average || 0,
    genre_ids: [],
    is_premium: m.is_premium || false,
    trailer_url: m.trailer_url || "",
    stream_url: m.stream_url || "",
  })) as Movie[];
}

export async function fetchPersistedWatchlist(): Promise<Movie[]> {
  const userKey = getAppUserKey();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("movie_payload, created_at")
    .eq("user_key", userKey)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => row.movie_payload as Movie);
}

export async function persistWatchlistItem(movie: Movie): Promise<void> {
  const userKey = getAppUserKey();
  const user = auth.currentUser;

  await supabase.from("watchlist_items").upsert({
    user_key: userKey,
    auth_user_id: user?.uid ?? null,
    movie_id: movie.id,
    movie_payload: serializeMovie(movie),
  }, { onConflict: "user_key,movie_id" });
}

export async function removePersistedWatchlistItem(movieId: number): Promise<void> {
  const userKey = getAppUserKey();
  await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_key", userKey)
    .eq("movie_id", movieId);
}

export async function logMoodScan(params: {
  moodId: string;
  detectedEmotion?: string | null;
  detectionMethod: MoodDetectionMethod;
  customPrompt?: string | null;
}): Promise<void> {
  const userKey = getAppUserKey();
  const user = auth.currentUser;

  await supabase.from("mood_scan_events").insert({
    user_key: userKey,
    auth_user_id: user?.uid ?? null,
    mood_id: params.moodId,
    detected_emotion: params.detectedEmotion ?? null,
    detection_method: params.detectionMethod,
    custom_prompt: params.customPrompt ?? null,
  });
}

export async function submitRecommendationFeedback(
  input: RecommendationFeedbackInput
): Promise<void> {
  const userKey = getAppUserKey();
  const user = auth.currentUser;

  await supabase.from("recommendation_feedback").insert({
    user_key: userKey,
    auth_user_id: user?.uid ?? null,
    movie_id: input.movieId,
    recommendation_source: input.recommendationSource,
    action: input.action,
    mood_id: input.moodId ?? null,
  });
}
