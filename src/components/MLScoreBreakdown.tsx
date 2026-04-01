import React from "react";
import { motion } from "framer-motion";

interface Breakdown {
  text: number;
  genre: number;
  rating: number;
  year: number;
}

const BARS: { key: keyof Breakdown; label: string; color: string }[] = [
  { key: "text",   label: "Plot",   color: "bg-violet-500" },
  { key: "genre",  label: "Genre",  color: "bg-fuchsia-500" },
  { key: "rating", label: "Rating", color: "bg-amber-400" },
  { key: "year",   label: "Era",    color: "bg-cyan-500" },
];

export const MLScoreBreakdown = ({ breakdown, score }: { breakdown: Breakdown; score: number }) => {
  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">ML Match</span>
        <span className="text-[11px] font-black text-primary">{Math.round(score * 100)}%</span>
      </div>
      {BARS.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-muted-foreground w-8 shrink-0">{label}</span>
          <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(breakdown[key] * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${color}`}
            />
          </div>
          <span className="text-[8px] font-bold text-muted-foreground w-5 text-right">
            {Math.round(breakdown[key] * 100)}
          </span>
        </div>
      ))}
    </div>
  );
};
