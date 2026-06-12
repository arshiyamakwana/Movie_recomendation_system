import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Star, Shield, Play, Loader2, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { getAppUserKey } from "@/lib/appUser";

// Your Razorpay Test Key ID
const RAZORPAY_KEY_ID = "rzp_test_Sz6x18h3fHwosu";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: Record<string, Record<string, string>>) => void) => void };
  }
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "₹149",
    amount: 14900, // in paise (₹149 × 100)
    period: "/month",
    features: ["720p Resolution", "1 Device", "Standard Library"],
    recommended: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹499",
    amount: 49900,
    period: "/month",
    features: ["4K + HDR", "4 Devices", "Early Access Originals", "Offline Downloads"],
    recommended: true,
  },
  {
    id: "standard",
    name: "Standard",
    price: "₹199",
    amount: 19900,
    period: "/month",
    features: ["1080p Resolution", "2 Devices", "Full Library"],
    recommended: false,
  },
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle?: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function saveReceipt(params: {
  razorpay_payment_id: string;
  plan: string;
  amount: number;
  user_id: string;
  user_key: string;
  user_name: string;
  user_email: string;
  movie_title?: string;
}) {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: params.user_id || params.user_key,
    user_name: params.user_name,
    user_email: params.user_email,
    plan: params.plan,
    status: "active",
    start_date: new Date().toISOString(),
    end_date: end.toISOString(),
    payment_id: params.razorpay_payment_id,
    amount: params.amount,
    movie_title: params.movie_title || null,
  });
  if (error) {
    console.error("Receipt save error:", JSON.stringify(error));
    throw error;
  }
  console.log("Receipt saved successfully!");
}

const SubscriptionModal = ({ isOpen, onClose, movieTitle }: SubscriptionModalProps) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ plan: string; paymentId: string } | null>(null);
  const [existingSub, setExistingSub] = useState<{ plan: string; end_date: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setChecking(true);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setChecking(false); return; }
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, end_date, status")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .single();
      if (data) setExistingSub({ plan: data.plan, end_date: data.end_date });
      setChecking(false);
    });
  }, [isOpen]);

  const handlePayment = async (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.id);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showError("Razorpay failed to load. Check your internet connection.");
      setLoadingPlan(null);
      return;
    }

    const userKey = getAppUserKey();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const userEmail = user?.email || "guest@filmflix.com";
    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "FilmFlix User";

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: plan.amount,
      currency: "INR",
      name: "FilmFlix",
      description: `${plan.name} Plan — ${plan.price}/month`,
      image: "/favicon.ico",
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: { color: "#6366f1" },
      modal: {
        ondismiss: () => setLoadingPlan(null),
      },
      handler: async (response: { razorpay_payment_id: string }) => {
        try {
          await saveReceipt({
            razorpay_payment_id: response.razorpay_payment_id,
            plan: plan.id,
            amount: plan.amount / 100,
            user_id: user?.id || userKey,
            user_key: userKey,
            user_name: userName,
            user_email: userEmail,
            movie_title: movieTitle,
          });
          setSuccess({ plan: plan.name, paymentId: response.razorpay_payment_id });
          showSuccess(`${plan.name} plan activated! Payment ID: ${response.razorpay_payment_id}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : JSON.stringify(err);
          showError(`Receipt save failed: ${msg}`);
          console.error("Full save error:", err);
        } finally {
          setLoadingPlan(null);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp: Record<string, Record<string, string>>) => {
      showError(`Payment failed: ${resp.error?.description}`);
      setLoadingPlan(null);
    });
    rzp.open();
  };

  const handleClose = () => {
    setSuccess(null);
    setLoadingPlan(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-[#0f172a] border-white/10 p-0 overflow-hidden shadow-2xl">
        <div className="relative p-8 md:p-12 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

          <AnimatePresence mode="wait">
            {checking ? (
              <motion.div key="checking" className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </motion.div>
            ) : existingSub ? (
              /* ── Already Subscribed ── */
              <motion.div key="subscribed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-col items-center text-center gap-6 py-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Check className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Already Subscribed!</h2>
                  <p className="text-slate-400 mt-2">You're on the <span className="text-primary font-black uppercase">{existingSub.plan}</span> plan.</p>
                  {existingSub.end_date && (
                    <p className="text-slate-500 text-xs mt-1">Valid until {new Date(existingSub.end_date).toLocaleDateString("en-IN")}</p>
                  )}
                </div>
                <Button onClick={handleClose} className="rounded-2xl font-black uppercase tracking-widest px-10 bg-primary">
                  Start Watching
                </Button>
              </motion.div>
            ) : success ? (
              /* ── Success Receipt ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex flex-col items-center text-center gap-6 py-8"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Payment Successful!</h2>
                  <p className="text-slate-400 mt-2">{success.plan} plan is now active.</p>
                </div>

                {/* Receipt card */}
                <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <Receipt className="w-5 h-5 text-primary" />
                    <span className="font-black uppercase tracking-widest text-xs text-primary">Payment Receipt</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Plan</span>
                      <span className="text-white font-bold">{success.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment ID</span>
                      <span className="text-white font-mono text-xs">{success.paymentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="text-white font-bold">{new Date().toLocaleDateString("en-IN")}</span>
                    </div>
                    {movieTitle && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">For Movie</span>
                        <span className="text-white font-bold truncate max-w-[150px]">{movieTitle}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/10 pt-3">
                      <span className="text-slate-400">Amount Paid</span>
                      <span className="text-green-400 font-black text-base">
                        {PLANS.find(p => p.name === success.plan)?.price}
                      </span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleClose} className="rounded-2xl font-black uppercase tracking-widest px-10">
                  Start Watching
                </Button>
              </motion.div>
            ) : (
              /* ── Plan Selection ── */
              <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
                <DialogHeader className="text-center space-y-4 mb-12">
                  <div className="flex justify-center mb-4">
                    <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
                      <Play className="w-8 h-8 text-primary fill-primary" />
                    </div>
                  </div>
                  <DialogTitle className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase">
                    Unlock the Full Experience
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                    {movieTitle ? (
                      <>Subscribe to watch <span className="text-white font-bold">{movieTitle}</span> and thousands more.</>
                    ) : (
                      "Choose a plan that fits your cinematic appetite."
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PLANS.map((plan) => (
                    <motion.div
                      key={plan.name}
                      whileHover={{ y: -8 }}
                      className={`relative flex flex-col p-6 rounded-3xl border ${
                        plan.recommended
                          ? "bg-primary/5 border-primary/40 shadow-[0_20px_50px_rgba(99,102,241,0.15)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      {plan.recommended && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                          Best Value
                        </div>
                      )}
                      <div className="mb-8">
                        <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">{plan.price}</span>
                          <span className="text-slate-500 text-sm font-bold">{plan.period}</span>
                        </div>
                      </div>
                      <ul className="space-y-4 mb-8 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        disabled={loadingPlan !== null}
                        onClick={() => handlePayment(plan)}
                        className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                          plan.recommended
                            ? "bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        }`}
                      >
                        {loadingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay with Razorpay"}
                      </Button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 border-t border-white/5 pt-8">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Shield className="w-4 h-4" /> Secured by Razorpay
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Zap className="w-4 h-4" /> Instant Access
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Star className="w-4 h-4" /> Cancel Anytime
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
