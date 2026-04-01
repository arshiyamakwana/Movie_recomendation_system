"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { LogIn, UserPlus, Loader2, Shield, Zap, Globe, Github, Mail, Phone } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone" | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showSuccess("Access Granted. Welcome back, Commander.");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showSuccess("Identity Created. Welcome to FilmFlix.");
      }
      navigate("/");
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      showSuccess("Neural link established.");
      navigate("/");
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      showSuccess("Verification code transmitted.");
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      showSuccess("Identity verified.");
      navigate("/");
    } catch (error: any) {
      showError("Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div id="recaptcha-container"></div>
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-3xl border border-foreground/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_100px_rgba(153,85,246,0.12)] relative overflow-hidden">
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6"
            >
              <Shield className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase mb-2">
              FILM<span className="text-primary">FLIX</span>
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">
              {isLogin ? "Authentication Required" : "Initialize New Profile"}
            </p>
          </div>

          {!authMethod ? (
            <div className="space-y-4">
              <Button 
                onClick={() => handleSocialLogin(googleProvider)}
                className="w-full h-14 gap-3 font-bold rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground transition-all"
              >
                <Globe className="w-5 h-5 text-blue-400" />
                Continue with Google
              </Button>
              <Button 
                onClick={() => handleSocialLogin(githubProvider)}
                className="w-full h-14 gap-3 font-bold rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground transition-all"
              >
                <Github className="w-5 h-5" />
                Continue with GitHub
              </Button>
              <Button 
                onClick={() => setAuthMethod("email")}
                className="w-full h-14 gap-3 font-bold rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground transition-all"
              >
                <Mail className="w-5 h-5 text-primary" />
                Continue with Email
              </Button>
              <Button 
                onClick={() => setAuthMethod("phone")}
                className="w-full h-14 gap-3 font-bold rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground transition-all"
              >
                <Phone className="w-5 h-5 text-green-400" />
                Continue with Phone
              </Button>
            </div>
          ) : authMethod === "email" ? (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Network ID</Label>
                <Input 
                  type="email" 
                  placeholder="commander@filmflix.io" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 bg-foreground/5 border-foreground/10 focus:border-primary/50 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Access Key</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 bg-foreground/5 border-foreground/10 focus:border-primary/50 rounded-2xl"
                />
              </div>
              <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest rounded-2xl bg-primary" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Establish Connection" : "Create Identity")}
              </Button>
              <button onClick={() => setAuthMethod(null)} className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest">Back to Options</button>
            </form>
          ) : (
            <form onSubmit={confirmationResult ? verifyCode : handlePhoneSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">
                  {confirmationResult ? "Verification Code" : "Phone Number"}
                </Label>
                <Input 
                  type={confirmationResult ? "text" : "tel"} 
                  placeholder={confirmationResult ? "123456" : "+1234567890"} 
                  value={confirmationResult ? verificationCode : phoneNumber}
                  onChange={(e) => confirmationResult ? setVerificationCode(e.target.value) : setPhoneNumber(e.target.value)}
                  required
                  className="h-14 bg-foreground/5 border-foreground/10 focus:border-primary/50 rounded-2xl"
                />
              </div>
              <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest rounded-2xl bg-primary" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (confirmationResult ? "Verify Identity" : "Send Code")}
              </Button>
              <button onClick={() => { setAuthMethod(null); setConfirmationResult(null); }} className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest">Back to Options</button>
            </form>
          )}

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Request New Identity" : "Return to Login Terminal"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;