"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { LogIn, UserPlus, Loader2, Shield, Globe } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          showSuccess(`Welcome back, ${data.user?.user_metadata?.full_name || email}!`);
          navigate("/");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;

        // If session exists immediately → email confirmation is off, go straight in
        if (data.session) {
          showSuccess(`Welcome to FilmFlix, ${name || email}!`);
          navigate("/");
        } else {
          // Email confirmation is ON — tell the user to check their inbox
          showSuccess("Account created! Check your email to confirm your account, then sign in.");
          setIsLogin(true);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Authentication failed.";
      if (msg.includes("Invalid login credentials")) {
        showError("Wrong email or password. Try again.");
      } else if (msg.includes("Email not confirmed")) {
        showError("Please confirm your email first, then sign in.");
      } else {
        showError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Sync into Supabase so session/profile works
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: user.uid, // use Firebase UID as a stable password
      });
      // If user doesn't exist in Supabase yet, sign them up
      if (error?.message?.includes("Invalid login")) {
        await supabase.auth.signUp({
          email: user.email!,
          password: user.uid,
          options: { data: { full_name: user.displayName, avatar_url: user.photoURL } },
        });
      }
      showSuccess(`Welcome, ${user.displayName || user.email}!`);
      navigate("/");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-card/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase mb-2">
              FILM<span className="text-primary">FLIX</span>
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">
              {isLogin ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          {/* Google via Firebase */}
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-14 gap-3 font-bold rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white mb-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Full Name</Label>
                <Input
                  type="text"
                  placeholder="Arshiya Makwana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="h-14 bg-white/5 border-white/10 focus:border-primary/50 rounded-2xl text-white"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Email</Label>
              <Input
                type="email"
                placeholder="you@filmflix.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-white/5 border-white/10 focus:border-primary/50 rounded-2xl text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-white/5 border-white/10 focus:border-primary/50 rounded-2xl text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 font-black uppercase tracking-widest rounded-2xl bg-primary mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
