import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-black mb-4 tracking-tighter text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-8 font-medium">This scene was cut from the final edit.</p>
        <a 
          href="/" 
          className="inline-flex items-center px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
