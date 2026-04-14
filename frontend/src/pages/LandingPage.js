import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { Briefcase, Zap, Phone, Mail, Users, ArrowRight, CheckCircle, Cpu, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

const PLANS = [
  { id: "free", name: "Free", price: "$0", period: "/month", features: ["3 Job Posts", "10 Candidates/Job", "AI Screening", "Email Support"], cta: "Get Started", highlight: false },
  { id: "starter", name: "Starter", price: "$29", period: "/month", features: ["5 Job Posts", "20 Candidates/Job", "AI Screening + Calls", "Priority Support", "Email to HR"], cta: "Start Trial", highlight: false },
  { id: "professional", name: "Professional", price: "$79", period: "/month", features: ["25 Job Posts", "100 Candidates/Job", "Advanced AI Agent", "Dedicated Support", "Custom Branding", "Analytics Dashboard"], cta: "Upgrade Now", highlight: true },
  { id: "enterprise", name: "Enterprise", price: "$199", period: "/month", features: ["Unlimited Jobs", "Unlimited Candidates", "White-label Solution", "API Access", "SLA Guarantee", "Custom Integrations"], cta: "Contact Sales", highlight: false },
];

const FEATURES = [
  { icon: Cpu, title: "AI-Powered Sourcing", desc: "Automatically find and rank candidates from LinkedIn and job portals using advanced AI matching." },
  { icon: Phone, title: "Automated Screening Calls", desc: "AI conducts phone interviews, evaluates responses, and scores candidates in real-time." },
  { icon: Mail, title: "Instant HR Notifications", desc: "Shortlisted candidates are instantly emailed to your HR team with full screening reports." },
  { icon: Users, title: "Pipeline Management", desc: "Track every candidate from sourcing to offer with a visual recruitment pipeline." },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-100 backdrop-saturate-150">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <Briefcase className="w-6 h-6 text-zinc-950" strokeWidth={1.5} />
            <span className="font-['Outfit'] text-xl font-semibold tracking-tight text-zinc-950">RecruitIT</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-600 hover:text-zinc-950 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-zinc-600 hover:text-zinc-950 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm" data-testid="go-to-dashboard-btn">
                Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="text-sm text-zinc-600 hover:text-zinc-950" data-testid="login-btn">
                  Sign In
                </Button>
                <Button onClick={() => navigate("/register")} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm" data-testid="get-started-btn">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url('https://images.pexels.com/photos/950241/pexels-photo-950241.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
              AI-Powered Recruitment Platform
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="font-['Outfit'] text-5xl sm:text-6xl font-medium tracking-tighter text-zinc-950 leading-[1.05]">
              Hire smarter.<br />Screen faster.<br />Close better.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-base leading-relaxed text-zinc-600 max-w-xl">
              RecruitIT automates your entire hiring pipeline. From sourcing candidates to AI-powered phone screenings, 
              we handle the heavy lifting so your team can focus on making great hires.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 flex items-center gap-4">
              <Button onClick={() => navigate("/register")} className="bg-blue-600 text-white hover:bg-blue-700 rounded-md px-6 h-11 text-sm font-medium" data-testid="hero-cta-btn">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="#features" className="text-sm text-zinc-600 hover:text-zinc-950 flex items-center gap-1 transition-colors">
                See how it works <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>

          {/* Bento stats */}
          <motion.div initial="hidden" animate="visible" className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Candidates Screened", value: "50K+" },
              { label: "Hours Saved", value: "12K+" },
              { label: "Companies", value: "800+" },
              { label: "Hire Rate", value: "94%" },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i + 4}
                className="bg-white border border-zinc-200 rounded-lg p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <p className="font-['Outfit'] text-3xl font-medium tracking-tight text-zinc-950">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.p variants={fadeUp} custom={0} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">How it works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-['Outfit'] text-3xl sm:text-4xl font-medium tracking-tight text-zinc-950 mt-2">
              End-to-end hiring automation
            </motion.h2>
          </motion.div>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white border border-zinc-200 rounded-lg p-8 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group">
                <f.icon className="w-8 h-8 text-zinc-950 mb-4 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
                <h3 className="font-['Outfit'] text-xl font-medium tracking-tight text-zinc-900">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Integration ribbon */}
          <div className="mt-16 overflow-hidden">
            <div className="flex items-center gap-24 animate-marquee whitespace-nowrap">
              {["LinkedIn", "Naukri.com", "Indeed", "Glassdoor", "AngelList", "LinkedIn", "Naukri.com", "Indeed"].map((name, i) => (
                <span key={i} className="text-sm text-zinc-400 uppercase tracking-widest font-medium">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Powered by AI</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-['Outfit'] text-3xl sm:text-4xl font-medium tracking-tight text-zinc-950 mt-2">
              Your AI recruiting agent
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-base leading-relaxed text-zinc-600">
              Upload a job description, define your ideal candidate profile, and let our AI agent handle the rest. 
              It sources, screens, and shortlists candidates automatically.
            </motion.p>
            <motion.ul variants={fadeUp} custom={3} className="mt-6 space-y-3">
              {["AI reads & understands your JD", "Sources candidates from multiple platforms", "Conducts automated phone screenings", "Scores and ranks each candidate", "Emails shortlist to your HR team"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </motion.ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="relative rounded-lg overflow-hidden border border-zinc-200">
            <img src="https://images.unsplash.com/photo-1702707422492-234b7d771397?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMG5vZGVzfGVufDB8fHx8MTc3NjE2Mjk5Nnww&ixlib=rb-4.1.0&q=85"
              alt="AI Network" className="w-full h-80 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
              <p className="text-white text-sm font-medium">Claude Sonnet 4.5 powered screening engine</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Pricing</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-['Outfit'] text-3xl sm:text-4xl font-medium tracking-tight text-zinc-950 mt-2">
              Plans that scale with you
            </motion.h2>
          </motion.div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className={`rounded-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  plan.highlight ? "bg-zinc-950 text-white border-2 border-zinc-950" : "bg-white border border-zinc-200"
                }`} data-testid={`pricing-card-${plan.id}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${plan.highlight ? "text-zinc-400" : "text-zinc-500"}`}>{plan.name}</p>
                <p className="font-['Outfit'] text-4xl font-medium tracking-tight mt-2">
                  {plan.price}<span className={`text-sm font-normal ${plan.highlight ? "text-zinc-400" : "text-zinc-500"}`}>{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-zinc-300" : "text-zinc-600"}`}>
                      <CheckCircle className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-emerald-400" : "text-emerald-600"}`} strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/register")}
                  className={`w-full mt-6 rounded-md text-sm ${
                    plan.highlight ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-950 text-white hover:bg-zinc-800"
                  }`}
                  data-testid={`pricing-cta-${plan.id}`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-zinc-950" strokeWidth={1.5} />
            <span className="font-['Outfit'] text-sm font-semibold text-zinc-950">RecruitIT</span>
          </div>
          <p className="text-xs text-zinc-500">&copy; {new Date().getFullYear()} RecruitIT. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
