import React from "react";
import { Home, Bookmark, Sparkles, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
}

const MobileNav = ({ activeTab, onTabChange, watchlistCount }: MobileNavProps) => {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "ai", icon: Sparkles, label: "AI Discovery" },
    { id: "watchlist", icon: Bookmark, label: "Saved", count: watchlistCount },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
      <div className="bg-card/90 backdrop-blur-3xl border border-foreground/10 rounded-[2.5rem] flex items-center justify-around p-2 shadow-[0_20px_50px_rgba(153,85,246,0.12)] pointer-events-auto">
        {navItems.map((item) => (
          item.path ? (
            <Link
              key={item.id}
              to={item.path}
              className="relative flex flex-col items-center gap-1.5 py-3 px-5 rounded-3xl transition-all duration-300 active:scale-90 text-muted-foreground"
            >
              <item.icon className="w-6 h-6 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </Link>
          ) : (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 py-3 px-5 rounded-3xl transition-all duration-300 active:scale-90",
                activeTab === item.id 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-transform", activeTab === item.id && "scale-110")} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-2 right-3 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center shadow-lg">
                  {item.count}
                </span>
              )}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default MobileNav;