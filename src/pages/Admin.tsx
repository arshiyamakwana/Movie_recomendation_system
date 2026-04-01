import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Users, CreditCard, Activity, Settings, 
  Search, ShieldCheck, TrendingUp, UserPlus, Zap, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal, 
  Mail, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft,
  Network, Fingerprint, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Total Users", value: "12,845", change: "+12.5%", trendingUp: true, icon: Users, color: "blue" },
  { label: "Monthly Revenue", value: "₹45,280", change: "+8.2%", trendingUp: true, icon: CreditCard, color: "emerald" },
  { label: "AI Recommendations", value: "142,500", change: "+24.1%", trendingUp: true, icon: Zap, color: "violet" },
  { label: "System Uptime", value: "99.98%", change: "-0.01%", trendingUp: false, icon: Activity, color: "rose" },
];

const RECENT_USERS = [
  { name: "Arshiya Makwana", email: "arshiyamakwana@gmail.com", status: "Premium", joinDate: "2026-03-29" },
  { name: "Sudeen Jain", email: "sudeen@example.com", status: "Basic", joinDate: "2026-03-28" },
  { name: "Alex Rivera", email: "alex@cinema.com", status: "Premium", joinDate: "2026-03-28" },
  { name: "Sarah Chen", email: "sarah@cine.io", status: "Standard", joinDate: "2026-03-27" },
];

const TRANSACTIONS = [
  { id: "TX-9012", user: "Arshiya Makwana", amount: "₹499", status: "Completed", date: "Just now" },
  { id: "TX-9011", user: "Alex Rivera", amount: "₹499", status: "Completed", date: "2 mins ago" },
  { id: "TX-9010", user: "Sarah Chen", amount: "₹199", status: "Pending", date: "15 mins ago" },
  { id: "TX-9009", user: "Michael Scott", amount: "₹149", status: "Failed", date: "1 hour ago" },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [aiThreshold, setAiThreshold] = useState(0.85);
  const [systemMaintenance, setSystemMaintenance] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-card/40 backdrop-blur-3xl p-6 hidden lg:block z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/40 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Film<span className="text-primary">Flix Admin</span></h1>
        </div>

        <nav className="space-y-2">
          {[
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "users", label: "User Management", icon: Users },
            { id: "payments", label: "Subscriptions", icon: CreditCard },
            { id: "ai", label: "AI & Analytics", icon: Zap },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
            Exit Terminal
          </Link>
        </div>
      </aside>

     
      <main className="lg:pl-64 pt-8 px-6 md:px-12 pb-24 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-white uppercase">Neural Control Center</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">Operational status: <span className="text-emerald-400 font-black">STABLE</span></p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Search operations..." 
                className="pl-10 h-12 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 transition-all text-xs"
              />
            </div>
            <Button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 p-0 text-white hover:bg-white/10 transition-all">
              <Mail className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {activeTab === "ai" && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" /> Recommendation Engine
                </h3>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">TF-IDF Sensitivity</label>
                      <span className="text-sm font-black text-primary">{(aiThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={aiThreshold} 
                      onChange={(e) => setAiThreshold(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary border border-white/10"
                    />
                    <p className="text-[10px] text-slate-500 italic">Controls how strictly the plot-based AI matches keywords in natural language queries.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Collaborative Model</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="rounded-2xl border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">Cosine Similarity</Button>
                      <Button variant="outline" className="rounded-2xl border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest">Pearson Correlation</Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-400" /> Real-time Analytics
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Active Neural Sessions</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Live Users</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-400">1,204</p>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Cache Hit Ratio</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">CDN Optimization</p>
                    </div>
                    <p className="text-2xl font-black text-primary">94.2%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Neural Cluster Map Section */}
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <Network className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Neural Cluster Distribution</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">System-Wide Taste Archetypes</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-violet-500/20 text-violet-400 px-4 py-1 font-black uppercase tracking-widest text-[10px]">
                  Global Latent Map v2.0
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 relative aspect-video bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden group">
                  {/* Simulated Scatter Plot Grid */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-5">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>

                 
                  {[
                    { x: "20%", y: "30%", color: "emerald", size: "w-32 h-32", label: "C1: Cinematic Mavericks" },
                    { x: "60%", y: "20%", color: "blue", size: "w-40 h-40", label: "C2: Blockbuster Elites" },
                    { x: "40%", y: "65%", color: "violet", size: "w-28 h-28", label: "C3: Noir Specialists" },
                    { x: "75%", y: "70%", color: "rose", size: "w-36 h-36", label: "C4: Indie Explorers" },
                  ].map((cluster, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.4, scale: 1 }}
                      whileHover={{ opacity: 0.8, scale: 1.05 }}
                      className={cn(
                        "absolute rounded-full blur-3xl transition-all cursor-pointer",
                        cluster.color === "emerald" ? "bg-emerald-500" :
                        cluster.color === "blue" ? "bg-blue-500" :
                        cluster.color === "violet" ? "bg-violet-500" : "bg-rose-500",
                        cluster.size
                      )}
                      style={{ left: cluster.x, top: cluster.y }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {cluster.label}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {Array.from({ length: 40 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: Math.random() * 0.5 + 0.2 }}
                      className="absolute w-1 h-1 rounded-full bg-white"
                      style={{ 
                        left: `${Math.random() * 90 + 5}%`, 
                        top: `${Math.random() * 90 + 5}%` 
                      }}
                    />
                  ))}

                  <div className="absolute bottom-6 left-6 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase">Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase">Churn Risk</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Archetype Performance</h4>
                  <div className="space-y-4">
                    {[
                      { name: "Cinematic Mavericks", value: 84, color: "emerald" },
                      { name: "Blockbuster Elites", value: 62, color: "blue" },
                      { name: "Noir Specialists", value: 45, color: "violet" },
                      { name: "Indie Explorers", value: 38, color: "rose" },
                    ].map((archetype) => (
                      <div key={archetype.name} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white uppercase">{archetype.name}</span>
                          <span className={cn("text-[10px] font-black", `text-${archetype.color}-400`)}>{archetype.value}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${archetype.value}%` }} 
                            className={cn("h-full", `bg-${archetype.color}-500`)} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                    Generate Cluster Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-12">
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Neural Ledger (Stripe)
                </h3>
                <div className="flex gap-4">
                  <Button variant="outline" className="rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest px-6 h-11">Download Report</Button>
                  <Button className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-6 h-11 shadow-lg shadow-emerald-500/20">Sync Stripe</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Total MRR</p>
                  <p className="text-3xl font-black text-white">₹45,280</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-2">+12.5% from last month</p>
                </div>
                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mb-1">Churn Rate</p>
                  <p className="text-3xl font-black text-white">1.2%</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-2">-0.4% improvement</p>
                </div>
                <div className="p-6 rounded-3xl bg-violet-500/5 border border-violet-500/20">
                  <p className="text-[10px] font-black text-violet-500/60 uppercase tracking-widest mb-1">Avg. LTV</p>
                  <p className="text-3xl font-black text-white">₹2,450</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Per unique operative</p>
                </div>
                <div className="p-6 rounded-3xl bg-slate-500/5 border border-slate-500/20">
                  <p className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest mb-1">Trial Conversion</p>
                  <p className="text-3xl font-black text-white">24%</p>
                  <p className="text-[10px] text-rose-400 font-bold mt-2">-2% vs previous</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction ID</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="text-right py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ledger Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {TRANSACTIONS.map((tx) => (
                      <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-mono text-[10px] text-slate-400 uppercase">{tx.id}</td>
                        <td className="py-4 text-sm font-bold text-white">{tx.user}</td>
                        <td className="py-4 text-sm font-black text-white">{tx.amount}</td>
                        <td className="py-4">
                          <Badge className={cn(
                            "rounded-lg text-[9px] font-black uppercase tracking-widest px-2.5 py-1",
                            tx.status === "Completed" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : 
                            tx.status === "Pending" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                            "bg-rose-400/10 text-rose-400 border border-rose-400/20"
                          )}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-4 text-right">
                          <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 text-slate-500">Receipt</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-12">
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" /> Global User Registry
                </h3>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button className="bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-6 h-11 shadow-lg shadow-primary/20">
                    <UserPlus className="w-4 h-4 mr-2" /> Invite Operative
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Now</p>
                  <p className="text-2xl font-black text-emerald-400">1,204</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Premium Users</p>
                  <p className="text-2xl font-black text-primary">8,421</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Banned/Purged</p>
                  <p className="text-2xl font-black text-rose-500">12</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subscription</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Login</th>
                      <th className="text-right py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {RECENT_USERS.map((user) => (
                      <tr key={user.email} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 text-primary font-black text-xs uppercase">
                              {user.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{user.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge className={cn(
                            "rounded-lg text-[9px] font-black uppercase tracking-widest px-2.5 py-1",
                            user.status === "Premium" ? "bg-primary/10 text-primary border border-primary/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          )}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-4 text-[10px] font-medium text-slate-400 font-mono uppercase">{user.joinDate}</td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white/5 text-rose-500/70 hover:text-rose-500 transition-all">
                              <ShieldAlert className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-12">
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">System Configuration</h3>
                  <p className="text-xs text-slate-400 font-medium">Global operational parameters.</p>
                </div>
              </div>

              <div className="space-y-8 max-w-2xl">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Maintenance Mode</p>
                    <p className="text-xs text-slate-500">Redirect all neural connections to status page.</p>
                  </div>
                  <div 
                    onClick={() => setSystemMaintenance(!systemMaintenance)}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      systemMaintenance ? "bg-primary" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      systemMaintenance ? "right-1" : "left-1"
                    )} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">API Endpoint Region</p>
                    <p className="text-xs text-slate-500">Current: us-east-1 (Primary)</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest px-4 h-10 hover:bg-white/5">Switch</Button>
                </div>

                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Neural Cache Purge</p>
                    <p className="text-xs text-slate-500">Force refresh all recommendation vectors.</p>
                  </div>
                  <Button className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-6 h-10 shadow-lg shadow-rose-500/20">Execute</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10", `text-${stat.color}-400`)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                      stat.trendingUp ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                    )}>
                      {stat.trendingUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
                  <p className="text-3xl font-black text-white">{stat.value}</p>
                </motion.div>
              ))}
            </div>

         
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* User List */}
              <div className="xl:col-span-8 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" /> Recent Operatives
                  </h3>
                  <Button variant="outline" className="rounded-xl border-white/10 text-xs font-bold hover:bg-white/5">View All</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                        <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="text-left py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Join Date</th>
                        <th className="text-right py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {RECENT_USERS.map((user) => (
                        <tr key={user.email} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 text-primary font-black text-xs">
                                {user.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-[10px] text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge className={cn(
                              "rounded-lg text-[9px] font-black uppercase tracking-widest px-2.5 py-1",
                              user.status === "Premium" ? "bg-primary/10 text-primary border border-primary/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                            )}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-4 text-[10px] font-medium text-slate-400 font-mono">{user.joinDate}</td>
                          <td className="py-4 text-right">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 text-slate-500">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

           
              <div className="xl:col-span-4 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Neural Ledger
                </h3>

                <div className="space-y-6">
                  {TRANSACTIONS.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between group p-3 rounded-2xl hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          tx.status === "Completed" ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" :
                          tx.status === "Pending" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                          "bg-rose-400/10 border-rose-400/20 text-rose-400"
                        )}>
                          {tx.status === "Completed" ? <CheckCircle2 className="w-5 h-5" /> :
                           tx.status === "Pending" ? <Zap className="w-5 h-5 animate-pulse" /> :
                           <ShieldAlert className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{tx.user}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">{tx.id} · {tx.date}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-white">{tx.amount}</p>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all">
                  Open Stripe Dashboard
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-6">
                  <Zap className="w-5 h-5 text-violet-400" /> AI Neural Health
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">TF-IDF Vector Density</span>
                      <span className="text-primary">85%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">DNA Recommendation Latency</span>
                      <span className="text-emerald-400">142ms</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: "92%" }} className="h-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-6">
                    <ShieldAlert className="w-5 h-5 text-rose-400" /> System Protocols
                  </h3>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-400/5 border border-rose-400/20 text-rose-400 mb-4">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                      Security alert: multiple failed login attempts from IP 192.168.1.1 — Protocol 4 initialized.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button className="flex-1 h-12 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">
                    Purge Logs
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                    Whitelist IP
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "overview" && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem]">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 opacity-20">
              <Settings className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Module Under Development</h3>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Neural connection pending...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;