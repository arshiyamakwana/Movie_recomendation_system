export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface CastMember {
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: string[];
  runtime?: number;
  tagline?: string;
  director?: string;
  cast?: CastMember[];
  trailer_key?: string;
  providers?: WatchProvider[];
  watch_link?: string;
  _reason?: string;
  _score?: number;
  /** Batch-normalized 52–100 for UI; strongest title in the list is 100%. */
  _displayMatchPercent?: number;
}

export interface Genre {
  id: number;
  name: string;
}