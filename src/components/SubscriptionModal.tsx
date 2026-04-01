import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Star, Shield, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { showSuccess, showError } from "@/utils/toast";

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe("pk_test_51P7Y2SArshiyaPlaceholderKey");

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle?: string;
}

const PLANS = [
  {
    id: "price_basic",
    name: "Basic",
    price: "₹149",
    period: "/month",
    features: ["720p Resolution", "1 Device", "Standard Content Library"],
    color: "slate",
    recommended: false,
  },
  {
    id: "price_premium",
    name: "Premium",
    price: "₹499",
    period: "/month",
    features: [
      "4K + HDR Resolution",
      "4 Devices",
      "Early Access to Originals",
      "Offline Downloads",
    ],
    color: "blue",
    recommended: true,
  },
  {
    id: "price_standard",
    name: "Standard",
    price: "₹199",
    period: "/month",
    features: ["1080p Resolution", "2 Devices", "Full Content Library"],
    color: "slate",
    recommended: false,
  },
];

const SubscriptionModal = ({
  isOpen,
  onClose,
  movieTitle,
}: SubscriptionModalProps) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePayment = async (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.id);
    
    try {
      // In a real application, you would:
      // 1. Call your backend to create a Stripe Checkout Session
      // const response = await fetch("/api/create-checkout-session", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ 
      //     planId: plan.id,
      //     email: "arshiyamakwana@gmail.com" 
      //   }),
      // });
      // const session = await response.json();
      // const stripe = await stripePromise;
      // const { error } = await stripe!.redirectToCheckout({ sessionId: session.id });

      // Simulating Stripe Payment Flow for arshiyamakwana@gmail.com
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccess(`Subscription successful! Redirecting to ${movieTitle || "content"}...`);
      
      setTimeout(() => {
        onClose();
        // Here you would normally redirect to the watch link
        // window.location.href = "https://www.themoviedb.org/movie/74018-a-cinderella-story-once-upon-a-song/watch?locale=US";
      }, 1500);

    } catch (err) {
      showError("Payment failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#0f172a] border-white/10 p-0 overflow-hidden shadow-2xl">
        <div className="relative p-8 md:p-12 overflow-hidden">
          {/* Background Decorative Orbs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

          <DialogHeader className="relative z-10 text-center space-y-4 mb-12">
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
                <>
                  Subscribe to watch <span className="text-white font-bold">{movieTitle}</span> and thousands of other cinematic masterpieces.
                </>
              ) : (
                "Choose a plan that fits your cinematic appetite."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ y: -8 }}
                className={`relative flex flex-col p-6 rounded-3xl border ${
                  plan.recommended
                    ? "bg-primary/5 border-primary/40 shadow-[0_20px_50px_rgba(59,130,246,0.15)]"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                    Best Value
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm font-bold">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {feature}
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
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 border-t border-white/5 pt-8 relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Shield className="w-4 h-4" />
              Secure Payment
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Zap className="w-4 h-4" />
              Instant Access
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Star className="w-4 h-4" />
              Cancel Anytime
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
