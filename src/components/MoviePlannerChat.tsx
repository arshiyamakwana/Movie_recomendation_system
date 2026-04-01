import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard,
  Send,
  Sparkles,
  X,
  Ticket,
  Popcorn,
  Moon,
  Heart,
  Loader2,
} from "lucide-react";
import { Movie } from "@/types/movie";
import {
  fetchQueryRecommendations,
  fetchWatchlistDNA,
  getImageUrl,
  type MovieLanguage,
} from "@/services/tmdb";
import { withDisplayMatchPercent } from "@/lib/mlDisplayMatch";
import { cn } from "@/lib/utils";

type Role = "bot" | "user";

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  picks?: Movie[];
}

const INTRO: ChatMessage = {
  id: "intro",
  role: "bot",
  text:
    "I'm the Marquee Mate — your **double-feature desk**. Ask for a night plan, a back-to-back bill, or a vibe (date night, solo wind-down, scary Sunday). I use the same TF-IDF search as AI Discovery — no generic lists.",
};

const QUICK = [
  { icon: Moon, label: "Friday stack", hint: "crowd-pleasing fun friday night movie entertaining" },
  { icon: Ticket, label: "Double bill", hint: "pair an intense film with a lighter chaser same evening" },
  { icon: Heart, label: "Date night", hint: "romantic chemistry cozy intimate drama or comedy" },
  { icon: Popcorn, label: "Solo decompress", hint: "comfort watch easy emotional reset after long day" },
  { icon: Sparkles, label: "From my saves", hint: "__WATCHLIST__" },
];

function planReply(lower: string): string | null {
  if (lower.includes("order") && (lower.includes("watch") || lower.includes("trilogy"))) {
    return (
      "**Trilogy night tip:** start with the strongest entry (often #2 in franchises), save the origin story for when you're hooked — or go chronological if the story is linear. Want three ML picks for a specific saga? Name it."
    );
  }
  if (lower.includes("snack") || lower.includes("pizza") || lower.includes("food")) {
    return "**Snack pairing:** salty + long movies, sweet + under 100 min. Pause between double features — reset the room.";
  }
  if (lower.includes("double") && lower.includes("feature")) {
    return "Pick **Slot A** (heavier) + **Slot B** (palate cleanser). I'll fetch two ML rows — try the quick chip or describe your A-film.";
  }
  return null;
}

interface MoviePlannerChatProps {
  watchlist: Movie[];
  onSelectMovie: (movie: Movie) => void;
  cinemaLanguage?: MovieLanguage;
}

const MoviePlannerChat = ({
  watchlist,
  onSelectMovie,
  cinemaLanguage = "all",
}: MoviePlannerChatProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, pending]);

  const pushBot = useCallback((text: string, picks?: Movie[]) => {
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "bot", text, picks },
    ]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
  }, []);

  const runQuery = useCallback(
    async (query: string, preamble: string) => {
      setPending(true);
      try {
        const raw = await fetchQueryRecommendations(query, cinemaLanguage);
        const picks = withDisplayMatchPercent(raw.slice(0, 6));
        pushBot(preamble, picks);
      } catch {
        pushBot("Couldn't reach the movie brain — try again in a sec.");
      } finally {
        setPending(false);
      }
    },
    [pushBot, cinemaLanguage]
  );

  const handleWatchlistQuick = useCallback(async () => {
    if (watchlist.length === 0) {
      pushUser("From my saves");
      pushBot("Save a few films first — I'll blend their **taste DNA** and suggest what to watch next.");
      return;
    }
    pushUser("From my saves");
    setPending(true);
    try {
      const raw = await fetchWatchlistDNA(watchlist, cinemaLanguage);
      const picks = withDisplayMatchPercent(raw.slice(0, 6));
      pushBot(
        `From your **${watchlist.length} saved** title(s) — TF-IDF taste merge + genre affinity. Tap a poster for details.`,
        picks
      );
    } catch {
      pushBot("Couldn't load DNA picks right now.");
    } finally {
      setPending(false);
    }
  }, [watchlist, cinemaLanguage, pushBot, pushUser]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;
    pushUser(text);
    setInput("");

    const lower = text.toLowerCase();
    const canned = planReply(lower);
    if (canned) {
      pushBot(canned);
      return;
    }

    await runQuery(
      text,
      "Here are **ML-ranked** matches for what you described (same engine as AI Discovery). Percentages are normalized so the strongest in this batch reads **100%**."
    );
  }, [input, pending, pushUser, runQuery, pushBot]);

  const handleQuick = useCallback(
    async (hint: string, label: string) => {
      if (hint === "__WATCHLIST__") {
        await handleWatchlistQuick();
        return;
      }
      pushUser(label);
      await runQuery(
        hint,
        `**${label}** — curated with your wording through TF-IDF. Strongest match in this set shows as **100%** on posters.`
      );
    },
    [handleWatchlistQuick, pushUser, runQuery]
  );

  return (
    <>
      <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: open ? 0.92 : 1, opacity: open ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: open ? "none" : "auto" }}
        whileHover={{ scale: open ? 0.92 : 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-[60] flex items-center gap-2 rounded-2xl border-2 border-primary/40 bg-zinc-950 px-4 py-3 text-primary shadow-[0_12px_40px_rgba(59,130,246,0.25)] md:bottom-8 md:right-8",
          "bottom-24 right-4 max-w-[calc(100vw-2rem)]"
        )}
        aria-label="Open movie planner chat"
      >
        <Clapperboard className="h-6 w-6 shrink-0 text-primary" />
        <span className="font-black uppercase tracking-[0.15em] text-[10px] md:text-[11px]">
          Marquee Mate
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-end bg-black/40 p-4 pb-24 md:items-center md:p-8 md:pb-8"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-primary/30 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
            >
              <header className="relative border-b border-primary/20 bg-gradient-to-r from-blue-950/40 to-zinc-950 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 rounded-xl p-2 text-primary/70 hover:bg-white/5 hover:text-primary"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-black/40">
                    <Ticket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black uppercase tracking-tight text-foreground">Marquee Mate</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      Plans · double bills · ML picks
                    </p>
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "ml-8 bg-primary/15 text-foreground border border-primary/25"
                        : "mr-4 border border-white/5 bg-zinc-900/90 text-foreground/90"
                    )}
                  >
                    <p className="whitespace-pre-wrap [&_strong]:font-black [&_strong]:text-primary">
                      {msg.text.split("**").map((chunk, i) =>
                        i % 2 === 1 ? (
                          <strong key={i}>{chunk}</strong>
                        ) : (
                          <span key={i}>{chunk}</span>
                        )
                      )}
                    </p>
                    {msg.picks && msg.picks.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {msg.picks.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSelectMovie(m);
                              setOpen(false);
                            }}
                            className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-black/50 text-left"
                          >
                            <img
                              src={getImageUrl(m.poster_path, "w185")}
                              alt=""
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 text-[8px] font-black uppercase leading-tight text-white line-clamp-2">
                              {m.title}
                            </span>
                            {m._displayMatchPercent !== undefined && (
                              <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-black text-primary">
                                {m._displayMatchPercent}%
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {pending && (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-zinc-900/80 px-4 py-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Scoring candidates…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/5 bg-zinc-950 px-3 pb-3 pt-2">
                <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Quick plans
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      disabled={pending}
                      onClick={() => handleQuick(q.hint, q.label)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-40"
                    >
                      <q.icon className="h-3 w-3" />
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="e.g. rainy Sunday noir marathon opener…"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={pending || !input.trim()}
                    onClick={handleSend}
                    className="shrink-0 rounded-2xl bg-primary px-4 py-3 text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MoviePlannerChat;
