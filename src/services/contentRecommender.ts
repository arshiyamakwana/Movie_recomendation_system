

const STOPWORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","will","would","could","should","may","might",
  "must","can","this","that","these","those","it","its","he","she","they",
  "we","you","i","his","her","their","our","your","as","into","through",
  "during","before","after","above","below","between","out","off","over",
  "under","while","who","which","what","when","where","how","all","each",
  "every","both","few","more","most","other","some","such","no","not",
  "only","own","same","so","than","too","very","just","about","up","him",
  "them","us","one","two","three","also","after","then","now","new","old",
]);


export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}


function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  if (tokens.length > 0) {
    for (const [term, count] of tf) {
      tf.set(term, count / tokens.length);
    }
  }
  return tf;
}


function computeIDF(documents: string[][]): Map<string, number> {
  const N = documents.length;
  const docFreq = new Map<string, number>();
  for (const tokens of documents) {
    const seen = new Set(tokens);
    for (const token of seen) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }
  return idf;
}


function buildTFIDFVector(
  tf: Map<string, number>,
  idf: Map<string, number>
): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || 0;
    vec.set(term, tfVal * idfVal);
  }
  return vec;
}


export function getMovieInsights(overview: string) {
  const tokens = tokenize(overview);
  const tf = computeTF(tokens);
  
  const sortedTerms = Array.from(tf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, score]) => ({ term, score }));

  return {
    tokens: tokens.length,
    uniqueTokens: tf.size,
    topTerms: sortedTerms,
    vectorDensity: (tf.size / 100).toFixed(4),   };
}


function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, valA] of a) {
    dot += valA * (b.get(term) || 0);
    normA += valA * valA;
  }
  for (const [, valB] of b) {
    normB += valB * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}


function jaccardSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}


export interface RawMovie {
  id: number;
  title: string;
  overview: string;
  genre_ids?: number[];
  genres?: string[];
  vote_average: number;
  release_date?: string;
  popularity?: number;
  poster_path?: string;
  backdrop_path?: string;
  director?: string;
  cast?: { name: string }[];
}

export interface RecommendedMovie extends RawMovie {
  _score: number;
  _reason: string;
  _breakdown?: {
    text: number;
    genre: number;
    rating: number;
    year: number;
  };
  _emotions?: Record<string, number>;
  _triggerWords?: string[];
}


const EMOTION_LEXICON: Record<string, string[]> = {
  joy: ["happy", "celebration", "love", "warmth", "inspiring", "hope", "friendship", "joy", "laugh", "fun", "tender", "heartwarming"],
  fear: ["ghost", "terror", "dark", "evil", "monster", "paranormal", "scary", "fear", "dread", "nightmare", "suspense", "danger"],
  sadness: ["emotional", "touching", "tears", "loss", "lonely", "tragedy", "sad", "grief", "bittersweet", "melancholy", "broken"],
  surprise: ["twist", "mystery", "illusion", "complex", "unreliable", "surreal", "perception", "mind", "secret", "reveal", "discovery"],
  anger: ["fight", "explosive", "battle", "war", "soldier", "weapon", "adrenaline", "vengeance", "revenge", "fury", "intense"],
};

export function detectEmotions(text: string): { emotions: Record<string, number>; triggerWords: string[] } {
  const tokens = tokenize(text);
  const scores: Record<string, number> = { joy: 0, fear: 0, sadness: 0, surprise: 0, anger: 0 };
  const triggers: Set<string> = new Set();

  tokens.forEach(token => {
    for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
      if (words.includes(token)) {
        scores[emotion] += 1;
        triggers.add(token);
      }
    }
  });

  const max = Math.max(...Object.values(scores), 1);
  for (const emotion in scores) {
    scores[emotion] = scores[emotion] / max;
  }

  return { emotions: scores, triggerWords: Array.from(triggers) };
}


function getGenreIds(movie: RawMovie): number[] {
  if (movie.genre_ids && movie.genre_ids.length > 0) return movie.genre_ids;
  return [];
}

function getYear(movie: RawMovie): number {
  if (!movie.release_date) return 2000;
  const parsed = parseInt(movie.release_date.substring(0, 4), 10);
  return isNaN(parsed) ? 2000 : parsed;
}

function inferReason(
  textSim: number,
  genreSim: number,
  ratingSim: number
): string {
  if (genreSim >= 0.7) return "Same genres & themes";
  if (textSim >= 0.35) return "Very similar storyline";
  if (genreSim >= 0.4) return "Matching genres";
  if (textSim >= 0.15) return "Similar plot elements";
  if (ratingSim >= 0.9) return "Same quality tier";
  return "Content match";
}



export const EMOTION_EXPANSIONS: Record<string, { profile: string; genres: number[] }> = {
   
  angry:      { profile: "rage fury anger revenge vengeance injustice violence betrayal confrontation wrath violent justice retribution rebel uprising fight brutal",          genres: [28, 80, 18, 53] },
  rage:       { profile: "rage fury anger revenge vengeance injustice violence betrayal confrontation wrath violent justice retribution rebel fight brutal",                  genres: [28, 80, 18, 53] },
  furious:    { profile: "rage fury anger revenge vengeance injustice violence betrayal confrontation wrath violent justice fight brutal explosive",                          genres: [28, 80, 18, 53] },

 
  sad:        { profile: "grief loss sorrow mourning heartbreak loneliness despair melancholy emotional tragedy pain regret longing hope beauty tearful touching",           genres: [18, 10749] },
  depressed:  { profile: "grief loss sorrow mourning heartbreak loneliness despair melancholy emotional tragedy pain regret isolation hope struggle mental",                 genres: [18] },
  melancholy: { profile: "melancholy sadness longing nostalgia bittersweet beauty sorrow quiet reflection grief poetic slow tender fragile loss memory",                    genres: [18, 10749] },


  nostalgic:  { profile: "nostalgia memory childhood past coming of age young friendship innocence 80s 90s retro growing up bittersweet hometown return journey",           genres: [18, 10751, 35] },
  nostalgic2: { profile: "nostalgia memory childhood past coming of age young friendship innocence 80s 90s retro growing up bittersweet hometown return journey",           genres: [18, 10751, 35] },

  
  romantic:   { profile: "love romance relationship passion tender longing attraction chemistry couple heart desire embrace intimate feeling together soulmate",              genres: [10749, 18, 35] },
  lovesick:   { profile: "love obsession longing yearning heartbreak unrequited desire passion distance loneliness romance missing connection waiting hope",                 genres: [10749, 18] },

    scared:     { profile: "horror fear terror dark supernatural ghost haunted shadow evil dread paranoid nightmare suspense monster creature cursed panic",                  genres: [27, 9648, 53] },
  anxious:    { profile: "tension anxiety paranoia suspense psychological thriller trapped uncertainty dread panic claustrophobia danger unseen threat unease",              genres: [53, 9648, 18] },

 
  happy:      { profile: "joy celebration happiness feel-good uplifting inspiring funny comedy laugh delight cheerful triumph success friendship light-hearted positive",    genres: [35, 10751, 10749] },
  euphoric:   { profile: "joy triumph ecstasy celebration victory music dance life energy youth wild freedom adventure spontaneous carefree light-hearted",                  genres: [35, 10402, 12] },

  bored:      { profile: "exciting unexpected twist surprise unusual bizarre weird quirky original fresh unconventional experimental bold absurd surreal mind-blowing",      genres: [878, 9648, 14, 35] },
  empty:      { profile: "existential meaning purpose identity loss self journey introspective quiet solitude reflection alone searching longing connection",                genres: [18, 878] },


  inspired:   { profile: "inspiring motivating triumph perseverance overcoming struggle true story achievement greatness dream ambition determination success underdog",     genres: [18, 36, 99] },
  motivated:  { profile: "inspiring triumph perseverance success underdog challenge achievement motivation sport competition winner dream greatness drive",                  genres: [18, 36, 99, 28] },

  
  confused:   { profile: "mystery puzzle plot twist unreliable narrative complexity layers hidden truth revelation unexpected secret identity illusion perception reality",  genres: [9648, 878, 53, 18] },

 
  adventurous:{ profile: "adventure journey exploration discovery quest exotic travel wilderness survival danger excitement freedom unknown bold daring world",               genres: [12, 28, 14, 878] },

 
  lonely:     { profile: "isolation loneliness solitude connection searching belonging stranger outsider empty quiet longing friendship warmth human bond touch",            genres: [18, 10749, 35] },
};


export function expandCustomMood(input: string): { profile: string; genres: number[] } {
  const key = input.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (EMOTION_EXPANSIONS[key]) return EMOTION_EXPANSIONS[key];

  
  for (const [k, v] of Object.entries(EMOTION_EXPANSIONS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  
  return { profile: input, genres: [] };
}

export function getCustomMoodRecommendations(
  input: string,
  pool: RawMovie[],
  topN = 20
): RecommendedMovie[] {
  const candidates = pool.filter((m) => m.overview);
  if (!input.trim() || candidates.length === 0) return [];

  const { profile, genres } = expandCustomMood(input);

  const allDocs = [profile, ...candidates.map((m) => m.overview)];
  const tokenizedDocs = allDocs.map((d) => tokenize(d));
  const idf = computeIDF(tokenizedDocs);
  const profileTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[0]), idf);

  const scored: RecommendedMovie[] = candidates.map((movie, idx) => {
    const movieTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[idx + 1]), idf);
    const textSim = cosineSimilarity(profileTFIDF, movieTFIDF);
    const genreSim = genres.length ? jaccardSimilarity(genres, getGenreIds(movie)) : 0;
    const popScore = movie.popularity ? Math.min(1, Math.log10(movie.popularity + 1) / 3) : 0;

    const combined = genres.length
      ? 0.50 * textSim + 0.35 * genreSim + 0.15 * popScore
      : 0.85 * textSim + 0.15 * popScore;

    return {
      ...movie,
      _score: Math.round(combined * 100) / 100,
      _reason: `Matched "${input}"`,
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, topN);
}


const MOOD_PROFILES: Record<string, string> = {
  "mind-bending":
    "mysterious mind twist reality illusion psychological complex unreliable perception surreal identity consciousness parallel universe time manipulation memory dream simulation cult obsession",
  adrenaline:
    "action explosive fight chase intense battle war combat rescue thriller danger speed race pursuit adrenaline rush survival soldier mission weapon",
  heartwarming:
    "love romance family friendship emotional touching inspiring hope redemption kindness compassion bond relationship warmth joy celebration forgiveness reunion tender",
  spooky:
    "horror scary ghost supernatural haunted terror fear dark evil creature monster paranormal suspense dread nightmare curse possessed demon shadow ritual",
  epic:
    "adventure journey quest legendary battle kingdom fantasy hero mythical grand destiny heroic ancient empire war sacrifice prophecy dragon magic power",
  chill:
    "funny comedy laugh lighthearted relax fun casual easygoing humor witty charming road trip buddy slice life everyday quirky playful",
};


const MOOD_GENRE_IDS: Record<string, number[]> = {
  "mind-bending": [9648, 878, 18, 53],        
  adrenaline:     [28, 12, 53, 80],           
  heartwarming:   [10749, 10751, 35, 18],   
  spooky:         [27, 9648, 53],           
  epic:           [12, 14, 36, 28],          
  chill:          [35, 99, 16, 10751],         
};



export function getMoodBasedRecommendations(
  mood: string,
  pool: RawMovie[],
  topN = 20
): RecommendedMovie[] {
  const moodProfile = MOOD_PROFILES[mood];
  if (!moodProfile || pool.length === 0) return [];

  const moodGenreIds = MOOD_GENRE_IDS[mood] || [];

  const allDocs = [moodProfile, ...pool.map((m) => m.overview || "")];
  const tokenizedDocs = allDocs.map((d) => tokenize(d));

  const idf = computeIDF(tokenizedDocs);

  const moodTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[0]), idf);

  const scored: RecommendedMovie[] = pool.map((movie, idx) => {
    const tokens = tokenizedDocs[idx + 1]; 
        const movieTFIDF = buildTFIDFVector(computeTF(tokens), idf);

    
    const textSim = cosineSimilarity(moodTFIDF, movieTFIDF);

    const genreSim = jaccardSimilarity(moodGenreIds, getGenreIds(movie));

  
    const popularityScore = movie.popularity
      ? Math.min(1, Math.log10(movie.popularity + 1) / 3)
      : 0;

    
    const combined =
      0.50 * textSim + 0.35 * genreSim + 0.15 * popularityScore;

    const moodLabel =
      mood.charAt(0).toUpperCase() + mood.slice(1).replace("-", " ");

    const emotionData = detectEmotions(movie.overview || "");

    return {
      ...movie,
      _score: Math.round(combined * 100) / 100,
      _reason: `${moodLabel} match`,
      _breakdown: {
        text: Math.round(textSim * 100) / 100,
        genre: Math.round(genreSim * 100) / 100,
        rating: Math.round(popularityScore * 100) / 100,
        year: 0,
      },
      _emotions: emotionData.emotions,
      _triggerWords: emotionData.triggerWords,
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, topN);
}

export function getQueryBasedRecommendations(
  query: string,
  pool: RawMovie[],
  topN = 12
): RecommendedMovie[] {
  const candidates = pool.filter((m) => m.overview);
  if (!query.trim() || candidates.length === 0) return [];

  const allDocs = [query, ...candidates.map((m) => m.overview)];
  const tokenizedDocs = allDocs.map((d) => tokenize(d));

  const idf = computeIDF(tokenizedDocs);
  const queryTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[0]), idf);

  const scored: RecommendedMovie[] = candidates.map((movie, idx) => {
    const movieTFIDF = buildTFIDFVector(
      computeTF(tokenizedDocs[idx + 1]),
      idf
    );
    const textSim = cosineSimilarity(queryTFIDF, movieTFIDF);

 
    const popScore = movie.popularity
      ? Math.min(1, Math.log10(movie.popularity + 1) / 3)
      : 0;

    const combined = 0.85 * textSim + 0.15 * popScore;

    return {
      ...movie,
      _score: Math.round(combined * 100) / 100,
      _reason: "Matches your description",
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, topN);
}

export function getWatchlistDNARecommendations(
  watchlist: RawMovie[],
  pool: RawMovie[],
  topN = 12
): RecommendedMovie[] {
  if (watchlist.length === 0) return [];

  
  const tasteProfile = watchlist.map((m) => m.overview || "").join(" ");
  const watchlistIds = new Set(watchlist.map((m) => m.id));

  
  const candidates = pool.filter(
    (m) => !watchlistIds.has(m.id) && m.overview
  );
  if (candidates.length === 0) return [];

  const allDocs = [tasteProfile, ...candidates.map((m) => m.overview)];
  const tokenizedDocs = allDocs.map((d) => tokenize(d));

  const idf = computeIDF(tokenizedDocs);
  const profileTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[0]), idf);

  
  const watchlistGenreIds = [
    ...new Set(watchlist.flatMap((m) => m.genre_ids || [])),
  ];

  const scored: RecommendedMovie[] = candidates.map((movie, idx) => {
    const movieTFIDF = buildTFIDFVector(
      computeTF(tokenizedDocs[idx + 1]),
      idf
    );
    const textSim = cosineSimilarity(profileTFIDF, movieTFIDF);
    const genreSim = jaccardSimilarity(watchlistGenreIds, getGenreIds(movie));
    const popScore = movie.popularity
      ? Math.min(1, Math.log10(movie.popularity + 1) / 3)
      : 0;

    const combined = 0.45 * textSim + 0.40 * genreSim + 0.15 * popScore;

    return {
      ...movie,
      _score: Math.round(combined * 100) / 100,
      _reason: "Matches your taste",
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, topN);
}


export function getColdStartPersonalized(
  pool: RawMovie[],
  topN = 24
): RecommendedMovie[] {
  const COLD_START_QUERY =
    "critically acclaimed popular movies diverse genres compelling story emotional depth action drama thriller comedy adventure sci fi romance horror mystery cinematic";
  return getQueryBasedRecommendations(COLD_START_QUERY, pool, topN);
}



const GENRE_IDS_LIST = [28,12,16,35,80,99,18,10751,14,36,27,10402,9648,10749,878,53,37];
export const GENRE_ID_NAMES: Record<number, string> = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",
  53:"Thriller",37:"Western",
};

const CLUSTER_PERSONALITY: Record<string, string> = {
  "Action·Adventure":"Thrill Seeker","Sci-Fi·Thriller":"Mind Explorer",
  "Drama·Romance":"Emotional Depth","Comedy·Family":"Light Heart",
  "Horror·Mystery":"Dark Curious","Fantasy·Adventure":"World Builder",
  "Crime·Thriller":"Edge Walker","Documentary·Drama":"Truth Seeker",
};

export interface TasteCluster {
  id: number; label: string; personality: string;
  movies: RawMovie[]; topGenres: string[]; avgRating: number; color: string;
}

function movieToVector(movie: RawMovie): number[] {
  const genres = GENRE_IDS_LIST.map(id => (movie.genre_ids?.includes(id) ? 1.5 : 0));
  const rating = (movie.vote_average || 5) / 10;
  const year = movie.release_date ? (parseInt(movie.release_date.slice(0, 4)) - 1950) / 80 : 0.5;
  return [...genres, rating, year];
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, ai, i) => s + (ai - b[i]) ** 2, 0));
}

function centroidOf(vecs: number[][]): number[] {
  const dim = vecs[0].length;
  return Array.from({ length: dim }, (_, d) => vecs.reduce((s, v) => s + v[d], 0) / vecs.length);
}

export function kMeansCluster(movies: RawMovie[], k = 3): TasteCluster[] {
  if (movies.length === 0) return [];
  k = Math.min(k, movies.length);
  const vecs = movies.map(movieToVector);
  const step = Math.floor(vecs.length / k);
  let centroids = Array.from({ length: k }, (_, i) => [...vecs[i * step]]);
  let assignments = new Array(vecs.length).fill(0);
  for (let iter = 0; iter < 25; iter++) {
    const next = vecs.map(v => {
      let best = 0, bestD = Infinity;
      centroids.forEach((c, ci) => { const d = euclidean(v, c); if (d < bestD) { bestD = d; best = ci; } });
      return best;
    });
    if (next.every((n, i) => n === assignments[i])) break;
    assignments = next;
    for (let c = 0; c < k; c++) {
      const members = vecs.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = centroidOf(members);
    }
  }
  const COLORS = ["#9333ea","#c026d3","#0891b2","#059669","#d97706"];
  return Array.from({ length: k }, (_, c) => {
    const members = movies.filter((_, i) => assignments[i] === c);
    if (members.length === 0) return null;
    const genreCount: Record<string, number> = {};
    members.forEach(m => (m.genre_ids || []).forEach(id => {
      const name = GENRE_ID_NAMES[id]; if (name) genreCount[name] = (genreCount[name] || 0) + 1;
    }));
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    const avgRating = members.reduce((s, m) => s + m.vote_average, 0) / members.length;
    const key = topGenres.slice(0, 2).join("·");
    const personality = CLUSTER_PERSONALITY[key] || topGenres[0] || "Eclectic";
    return { id: c, label: topGenres.join(" · "), personality, movies: members, topGenres, avgRating: +avgRating.toFixed(1), color: COLORS[c % COLORS.length] };
  }).filter(Boolean) as TasteCluster[];
}



export interface TopTerm { term: string; score: number; }

export function extractTopTerms(texts: string[], topN = 20): TopTerm[] {
  if (texts.length === 0) return [];
  const docs = texts.map(tokenize);
  const idf = computeIDF(docs);
  const merged = new Map<string, number>();
  docs.forEach(tokens => {
    const tf = computeTF(tokens);
    const vec = buildTFIDFVector(tf, idf);
    for (const [term, score] of vec) merged.set(term, (merged.get(term) || 0) + score);
  });
  return [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
    .map(([term, score]) => ({ term, score: Math.round(score * 100) / 100 }));
}



export interface GenreAffinity { genreId: number; name: string; affinity: number; count: number; }

export function computeGenreAffinity(watchlist: RawMovie[]): GenreAffinity[] {
  const counts: Record<number, number> = {};
  watchlist.forEach(m => (m.genre_ids || []).forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
  const maxCount = Math.max(1, ...Object.values(counts));
  return Object.entries(counts).filter(([id]) => GENRE_ID_NAMES[+id])
    .map(([id, count]) => ({ genreId: +id, name: GENRE_ID_NAMES[+id], affinity: +(count / maxCount).toFixed(2), count }))
    .sort((a, b) => b.affinity - a.affinity).slice(0, 8);
}



const PERSONA_PROFILES = [
  { name: "The Adrenaline Junkie", genres: [28,12,53,80], description: "Loves action, chases, and edge-of-seat thrills." },
  { name: "The Cinephile",         genres: [18,36,99,9648], description: "Appreciates deep narratives and artistic films." },
  { name: "The Dreamer",           genres: [14,878,16,12], description: "Escapes into fantasy worlds and sci-fi universes." },
  { name: "The Romantic",          genres: [10749,35,18,10751], description: "Drawn to emotion, heart, and human connection." },
  { name: "The Night Owl",         genres: [27,53,9648,80], description: "Thrives on suspense, horror, and dark mysteries." },
];

export interface CollabResult {
  closestPersona: { name: string; genres: number[]; description: string };
  similarity: number;
  recommendations: RecommendedMovie[];
}

export function collaborativeFilter(watchlist: RawMovie[], pool: RawMovie[], topN = 12): CollabResult | null {
  if (watchlist.length === 0) return null;
  const userGenreIds = [...new Set(watchlist.flatMap(m => m.genre_ids || []))];
  let bestPersona = PERSONA_PROFILES[0], bestSim = 0;
  PERSONA_PROFILES.forEach(p => {
    const sim = jaccardSimilarity(userGenreIds, p.genres);
    if (sim > bestSim) { bestSim = sim; bestPersona = p; }
  });
  const watchlistIds = new Set(watchlist.map(m => m.id));
  const candidates = pool.filter(m => !watchlistIds.has(m.id) && m.overview);
  const scored: RecommendedMovie[] = candidates.map(movie => {
    const personaSim = jaccardSimilarity(bestPersona.genres, movie.genre_ids || []);
    const userSim = jaccardSimilarity(userGenreIds, movie.genre_ids || []);
    const combined = 0.5 * personaSim + 0.5 * userSim;
    return { ...movie, _score: +combined.toFixed(2), _reason: `${bestPersona.name} match` };
  });
  return { closestPersona: bestPersona, similarity: +bestSim.toFixed(2), recommendations: scored.sort((a, b) => b._score - a._score).slice(0, topN) };
}

// ─── Main Recommender ────────────────────────────────────────

/**
 * Pure content-based recommendation using TF-IDF + Jaccard + proximity.
 *
 * @param target   The movie the user selected / is viewing
 * @param pool     All candidate movies to score against
 * @param topN     How many results to return (default 12)
 * @returns        Sorted list of recommended movies with _score and _reason
 */
export function getContentBasedRecommendations(
  target: RawMovie,
  pool: RawMovie[],
  topN = 12
): RecommendedMovie[] {
 
  const candidates = pool.filter((m) => m.id !== target.id && m.overview);

  if (candidates.length === 0) return [];

  const allMovies = [target, ...candidates];
  const tokenizedDocs = allMovies.map((m) => tokenize(m.overview || ""));


  const idf = computeIDF(tokenizedDocs);


  const targetTFIDF = buildTFIDFVector(computeTF(tokenizedDocs[0]), idf);
  const targetGenreIds = getGenreIds(target);
  const targetYear = getYear(target);


  const scored: RecommendedMovie[] = candidates.map((movie, idx) => {
    const tokens = tokenizedDocs[idx + 1]; // +1 = skip target at index 0
    const movieTFIDF = buildTFIDFVector(computeTF(tokens), idf);

    const textSim = cosineSimilarity(targetTFIDF, movieTFIDF);

   
    const genreSim = jaccardSimilarity(targetGenreIds, getGenreIds(movie));


    const ratingDiff = Math.abs(target.vote_average - movie.vote_average);
    const ratingSim = Math.max(0, 1 - ratingDiff / 10);

    const yearDiff = Math.abs(targetYear - getYear(movie));
    const yearSim = Math.max(0, 1 - yearDiff / 30);

    
    const combined =
      0.40 * textSim +
      0.40 * genreSim +
      0.10 * ratingSim +
      0.10 * yearSim;

    return {
      ...movie,
      _score: Math.round(combined * 100) / 100,
      _reason: inferReason(textSim, genreSim, ratingSim),
      _breakdown: {
        text: Math.round(textSim * 100) / 100,
        genre: Math.round(genreSim * 100) / 100,
        rating: Math.round(ratingSim * 100) / 100,
        year: Math.round(yearSim * 100) / 100,
      },
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, topN);
}
