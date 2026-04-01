import React from "react";

const ThreeBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0f172a] overflow-hidden">
      {/* Soft gradient orbs */}
      <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] bg-blue-500/10 blur-[140px] rounded-full animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-400/5 blur-[80px] rounded-full" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(221,83%,53%) 1px, transparent 1px), linear-gradient(90deg, hsl(221,83%,53%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
};

export default ThreeBackground;
