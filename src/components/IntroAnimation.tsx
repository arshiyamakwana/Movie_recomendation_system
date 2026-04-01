"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const letters = "FilmFlix".split("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
    exit: {
      opacity: 0,
      scale: 1.2,
      filter: "blur(40px)",
      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      y: 40,
      rotateX: -90,
      filter: "blur(10px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      rotateX: 0,
      filter: "blur(0px)",
      transition: { 
        type: "spring",
        damping: 15,
        stiffness: 150
      }
    }
  };

  const glitchVariants = {
    animate: {
      x: [0, -2, 2, -1, 1, 0],
      opacity: [1, 0.8, 1, 0.9, 1],
      transition: {
        duration: 0.2,
        repeat: Infinity,
        repeatType: "reverse" as const,
        repeatDelay: 2
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden perspective-1000"
        >
         
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 4 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent"
          />

          <div className="relative flex items-center justify-center gap-1 md:gap-4">
            {letters.map((char, i) => (
              <motion.div
                key={i}
                variants={letterVariants}
                className="relative"
              >
                <motion.span
                  variants={glitchVariants}
                  animate="animate"
                  className={`text-7xl md:text-[14rem] font-black tracking-tighter select-none inline-block ${
                    i >= 4 ? "text-primary" : "text-white"
                  }`}
                  style={{
                    textShadow: i >= 4
                      ? "0 0 80px rgba(153,85,246,0.7), 0 0 20px rgba(153,85,246,0.5)"
                      : "0 0 40px rgba(255,255,255,0.2)"
                  }}
                >
                  {char}
                </motion.span>
                
               
                <motion.div
                  initial={{ top: "-10%", opacity: 0 }}
                  animate={{ top: "110%", opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className="absolute left-0 right-0 h-[2px] bg-primary/50 blur-[1px] z-10"
                />
              </motion.div>
            ))}
          </div>

      
          <motion.div
            initial={{ x: "-100%", skewX: -20 }}
            animate={{ x: "200%" }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
            className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          />

     
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_90%)] pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroAnimation;