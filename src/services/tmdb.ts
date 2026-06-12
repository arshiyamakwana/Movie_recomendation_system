import { Movie } from "@/types/movie";
import {
  getContentBasedRecommendations,
  getColdStartPersonalized,
  getMoodBasedRecommendations,
  getQueryBasedRecommendations,
  getCustomMoodRecommendations,
  getWatchlistDNARecommendations,
  expandCustomMood,
  RawMovie,
} from "./contentRecommender";

const API_KEY = "0bff91ea76310bb76072645d045d15fc";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";



export const GENRE_MAP: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  // Fantasy: 14,
  // History: 36,
  // Horror: 27,
  // Music: 10402,
  // Mystery: 9648,
  // Romance: 10749,
  // "Sci-Fi": 878,
  // Thriller: 53,
};

export const MOOD_MAP: Record<string, number[]> = {
  happy:    [10749, 35, 10751],
  sad:      [18, 10749],
  angry:    [28, 53, 80],
  surprise: [878, 9648, 53],
  fear:     [27, 9648],
  disgust:  [80, 18, 27],
  neutral:  [878, 9648, 12, 35],
};


export type MovieLanguage = "all" | "hindi" | "hollywood";

export const LANGUAGE_MAP: Record<MovieLanguage, string> = {
  all: "",           
  hindi: "hi",      
  hollywood: "en",   
};

export const REGION_MAP: Record<MovieLanguage, string> = {
  all: "US",
  hindi: "IN",       
  hollywood: "US",   
};


export function discoverLangSuffix(language: MovieLanguage): string {
  if (language === "all") return "";
  const code = LANGUAGE_MAP[language];
  if (!code) return "";
  const reg = language === "hindi" ? "&region=IN" : "&region=US";
  return `&with_original_language=${code}${reg}`;
}

function mergeDiscoverResults(
  responses: { results?: unknown[] }[]
): RawMovie[] {
  const seen = new Set<number>();
  const out: RawMovie[] = [];
  for (const res of responses) {
    for (const m of (res.results || []) as RawMovie[]) {
      if (!seen.has(m.id) && m.overview) {
        seen.add(m.id);
        out.push(m);
      }
    }
  }
  return out;
}


export async function fetchMlCandidatePool(
  language: MovieLanguage,
  discoverPage: number
): Promise<RawMovie[]> {
  if (language === "all") {
    const [trending, popular, topRated, discover] = await Promise.all([
      fetchFromTMDB(`/trending/movie/week`),
      fetchFromTMDB(`/movie/popular?page=1`),
      fetchFromTMDB(`/movie/top_rated?page=1`),
      fetchFromTMDB(`/discover/movie?sort_by=popularity.desc&page=${discoverPage}`),
    ]);
    return mergeDiscoverResults([trending, popular, topRated, discover]);
  }

  const q = discoverLangSuffix(language);
  const [dPop, dVote, dAlt, dRecent] = await Promise.all([
    fetchFromTMDB(
      `/discover/movie?sort_by=popularity.desc${q}&page=${discoverPage}`
    ),
    fetchFromTMDB(
      `/discover/movie?sort_by=vote_average.desc&vote_count.gte=40${q}&page=1`
    ),
    fetchFromTMDB(
      `/discover/movie?sort_by=popularity.desc${q}&page=${Math.min(
        discoverPage + 3,
        10
      )}`
    ),
    fetchFromTMDB(
      `/discover/movie?sort_by=primary_release_date.desc${q}&page=1`
    ),
  ]);

  return mergeDiscoverResults([dPop, dVote, dAlt, dRecent]);
}



const fetchFromTMDB = async (endpoint: string) => {
  const url = `${BASE_URL}${endpoint}${
    endpoint.includes("?") ? "&" : "?"
  }api_key=${API_KEY}&include_adult=false&vote_average.gte=5&certification_country=US&certification.lte=PG-13`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const errorData = await res.json();
      console.error("TMDB API Full Error:", errorData);
      throw new Error(
        errorData.status_message || `TMDB Error ${res.status}`
      );
    }

    return await res.json();
  } catch (error) {
    console.error("Network/TMDB Error:", error);
    throw error;
  }
};



export const getImageUrl = (
  path: string,
  size: "w92" | "w185" | "w500" | "original" = "w500"
) => {
  if (!path) return "/placeholder.svg";
  if (path.startsWith("http")) return path; // already a full URL (Supabase movies)
  return `${IMAGE_BASE}/${size}${path}`;
};


export const fetchRecentlyReleased = async (
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const q = discoverLangSuffix(language);
  const data = await fetchFromTMDB(
    `/discover/movie?sort_by=primary_release_date.desc&vote_count.gte=10${q}`
  );
  return data.results || [];
};

// ✅ UPDATED: fetchTrending now supports hindi / hollywood / all
export const fetchTrending = async (
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const lang = LANGUAGE_MAP[language];
  const langFilter = lang ? `?with_original_language=${lang}` : "";
  const data = await fetchFromTMDB(`/trending/movie/day${langFilter}`);
  return data.results || [];
};

// ✅ UPDATED: discoverMovies now supports language filter
export const discoverMovies = async (
  genreIds: number[],
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const genres = genreIds.join("|");
  const lang = LANGUAGE_MAP[language];
  const langFilter = lang ? `&with_original_language=${lang}` : "";
  const data = await fetchFromTMDB(
    `/discover/movie?with_genres=${genres}&sort_by=popularity.desc${langFilter}`
  );
  return data.results || [];
};

export const searchMovies = async (
  query: string,
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const lang = LANGUAGE_MAP[language];
  const langFilter = lang ? `&with_original_language=${lang}` : "";
  const data = await fetchFromTMDB(
    `/search/movie?query=${encodeURIComponent(query)}${langFilter}`
  );
  return data.results || [];
};


export const fetchBollywood = async (): Promise<Movie[]> => {
  const data = await fetchFromTMDB(
    `/discover/movie?with_original_language=hi&sort_by=popularity.desc&region=IN`
  );
  return data.results || [];
};


export const fetchHollywood = async (): Promise<Movie[]> => {
  const data = await fetchFromTMDB(
    `/discover/movie?with_original_language=en&sort_by=popularity.desc&region=US`
  );
  return data.results || [];
};



export const getMovieTrailer = async (
  id: number
): Promise<string | null> => {
  const data = await fetchFromTMDB(`/movie/${id}/videos`);

  return (
    data.results?.find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube"
    )?.key || null
  );
};

export const getMovieDetails = async (
  id: number,
  language: MovieLanguage = "all"
): Promise<Movie> => {
  const [details, credits, videos, providersData] =
    await Promise.all([
      fetchFromTMDB(`/movie/${id}`),
      fetchFromTMDB(`/movie/${id}/credits`),
      fetchFromTMDB(`/movie/${id}/videos`),
      fetchFromTMDB(`/movie/${id}/watch/providers`),
    ]);

  const trailer =
    videos.results?.find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube"
    )?.key;

  const director =
    credits.crew?.find((c: any) => c.job === "Director")?.name;

  const cast =
    credits.cast?.slice(0, 8).map((c: any) => ({
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    })) || [];

  const results = providersData.results || {};

  // ✅ Pick IN region for Hindi, US for everything else
  const region = REGION_MAP[language];
  const regionProviders = results[region] || results["US"] || {};

  const providers = [
    ...(regionProviders.flatrate || []),
    ...(regionProviders.buy || []),
    ...(regionProviders.rent || []),
  ].slice(0, 5);

  const justWatchBase =
    language === "hindi"
      ? "https://www.justwatch.com/in/search?q="
      : "https://www.justwatch.com/us/search?q=";

  const watchLink =
    regionProviders.link ||
    `${justWatchBase}${encodeURIComponent(details.title)}`;

  return {
    ...details,
    genres: details.genres?.map((g: any) => g.name),
    director,
    cast,
    trailer_key: trailer,
    watch_link: watchLink,
    providers: providers.map((p: any) => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path,
    })),
  };
};


export const getRecommendations = async (
  id: number
): Promise<Movie[]> => {
  const data = await fetchFromTMDB(
    `/movie/${id}/recommendations`
  );

  return (data.results || []).map((m: any) => ({
    ...m,
    _reason: "Based on similar themes",
    _score: Math.round(m.vote_average * 10) / 100,
  }));
};


export const fetchMoodRecommendations = async (
  mood: string,
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const moodGenreIds = {
    happy:          [10749, 35, 10751, 18],
    sad:            [18, 36, 10402],
    angry:          [28, 53, 80, 12],
    surprise:       [878, 9648, 53, 12],
    fear:           [27, 9648, 53],
    disgust:        [80, 18, 27, 9648],
    neutral:        [878, 9648, 12, 35, 99],
    heartwarming:   [10749, 10751, 35, 18],
    adrenaline:     [28, 12, 53, 80],
    chill:          [35, 99, 16, 10751],
    spooky:         [27, 9648, 53],
    "mind-bending": [9648, 878, 18, 53],
  }[mood] || [];

  const genres = moodGenreIds.join("|");
  const q = discoverLangSuffix(language);

  const [page1, page2, page3, page4] = await Promise.all([
    fetchFromTMDB(
      `/discover/movie?with_genres=${genres}&sort_by=popularity.desc&page=1${q}`
    ),
    fetchFromTMDB(
      `/discover/movie?with_genres=${genres}&sort_by=vote_average.desc&vote_count.gte=80&page=1${q}`
    ),
    fetchFromTMDB(
      `/discover/movie?with_genres=${genres}&sort_by=popularity.desc&page=2${q}`
    ),
    language === "all"
      ? fetchFromTMDB(`/trending/movie/week`)
      : fetchFromTMDB(
          `/discover/movie?with_genres=${genres}&sort_by=popularity.desc&page=3${q}`
        ),
  ]);

  const seen = new Set<number>();
  const candidates: RawMovie[] = [];
  for (const result of [page1, page2, page3, page4]) {
    for (const m of (result.results || []) as RawMovie[]) {
      if (!seen.has(m.id) && m.overview) {
        seen.add(m.id);
        candidates.push(m);
      }
    }
  }

  const recs = getMoodBasedRecommendations(mood, candidates, 20);
  return recs as Movie[];
};


export const fetchQueryRecommendations = async (
  query: string,
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const candidates = await fetchMlCandidatePool(language, 1);
  return getQueryBasedRecommendations(query, candidates, 12) as Movie[];
};


export const fetchCustomMoodRecommendations = async (
  input: string,
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const { genres } = expandCustomMood(input);

  let candidates: RawMovie[];
  if (genres.length) {
    const genreStr = genres.join("|");
    const q = discoverLangSuffix(language);
    const [p1, p2, p3] = await Promise.all([
      fetchFromTMDB(`/discover/movie?with_genres=${genreStr}&sort_by=popularity.desc&page=1${q}`),
      fetchFromTMDB(`/discover/movie?with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=80&page=1${q}`),
      fetchFromTMDB(`/discover/movie?with_genres=${genreStr}&sort_by=popularity.desc&page=2${q}`),
    ]);
    const seen = new Set<number>();
    candidates = [];
    for (const res of [p1, p2, p3]) {
      for (const m of (res.results || []) as RawMovie[]) {
        if (!seen.has(m.id) && m.overview) { seen.add(m.id); candidates.push(m); }
      }
    }
  } else {
    candidates = await fetchMlCandidatePool(language, 1);
  }

  return getCustomMoodRecommendations(input, candidates, 20) as Movie[];
};


/** Fetches a pool and ranks by similarity to the user's combined watchlist taste profile. */

export const fetchWatchlistDNA = async (
  watchlist: Movie[],
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const candidates = await fetchMlCandidatePool(language, 1);
  return getWatchlistDNARecommendations(
    watchlist as RawMovie[],
    candidates,
    12
  ) as Movie[];
};


export const fetchPersonalizedHomeFeed = async (
  watchlist: Movie[],
  poolVariant = 0,
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const discoverPage = 1 + (Math.abs(poolVariant) % 10);
  const candidates = await fetchMlCandidatePool(language, discoverPage);

  if (watchlist.length >= 1) {
    return getWatchlistDNARecommendations(
      watchlist as RawMovie[],
      candidates,
      24
    ) as Movie[];
  }

  return getColdStartPersonalized(candidates, 24) as Movie[];
};


export const getContentRecommendations = async (
  target: Movie,
  existingPool: Movie[] = [],
  language: MovieLanguage = "all"
): Promise<Movie[]> => {
  const rawTarget = target as RawMovie & { genre_ids?: number[] };
  const genreIds: number[] =
    rawTarget.genre_ids ||
    (target.genres
      ? target.genres
          .map((name: string) => {
            const entry = Object.entries(GENRE_MAP).find(([k]) => k === name);
            return entry ? entry[1] : undefined;
          })
          .filter((id): id is number => id !== undefined)
      : []);

  const q = discoverLangSuffix(language);

  const fetches: Promise<any>[] = [];
  if (language === "all") {
    fetches.push(fetchFromTMDB(`/trending/movie/week`));
  } else {
    fetches.push(
      fetchFromTMDB(`/discover/movie?sort_by=popularity.desc${q}&page=1`)
    );
  }

  if (genreIds.length > 0) {
    fetches.push(
      fetchFromTMDB(
        `/discover/movie?with_genres=${genreIds.join(",")}&sort_by=popularity.desc&page=1${q}`
      ),
      fetchFromTMDB(
        `/discover/movie?with_genres=${genreIds.join(",")}&sort_by=vote_average.desc&vote_count.gte=200&page=1${q}`
      )
    );
  }

  const results = await Promise.all(fetches);

 
  const seen = new Set<number>();
  const candidates: RawMovie[] = existingPool.map((m) => m as RawMovie);
  for (const result of results) {
    for (const m of (result.results || []) as RawMovie[]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        candidates.push(m);
      }
    }
  }

  const recs = getContentBasedRecommendations(target as RawMovie, candidates, 12);
  return recs as Movie[];
};