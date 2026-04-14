import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { Briefcase, Users, UserCheck, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/dashboard/stats");
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = stats ? [
    { label: "Active Jobs", value: stats.active_jobs, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Candidates", value: stats.total_candidates, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Shortlisted", value: stats.shortlisted, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Screening", value: stats.pending_screening, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ] : [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl" data-testid="dashboard-page">
        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="font-['Outfit'] text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">
            Dashboard
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="mt-1 text-sm text-zinc-600">
            Overview of your recruitment pipeline
          </motion.p>
        </motion.div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-lg p-5 animate-pulse">
                <div className="h-4 w-20 bg-zinc-200 rounded mb-3" />
                <div className="h-8 w-12 bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <motion.div initial="hidden" animate="visible" className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, i) => (
                <motion.div key={card.label} variants={fadeUp} custom={i + 2}
                  className="bg-white border border-zinc-200 rounded-lg p-5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300"
                  data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{card.label}</span>
                    <div className={`w-8 h-8 rounded-md ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="font-['Outfit'] text-3xl font-medium tracking-tight text-zinc-950">{card.value}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Recent jobs */}
            <div className="mt-8 grid lg:grid-cols-2 gap-6">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}
                className="bg-white border border-zinc-200 rounded-lg" data-testid="recent-jobs-section">
                <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-['Outfit'] text-base font-medium text-zinc-950">Recent Jobs</h3>
                  <button onClick={() => navigate("/jobs")} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-zinc-100">
                  {stats?.recent_jobs?.length > 0 ? stats.recent_jobs.map((job) => (
                    <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                      className="w-full text-left px-5 py-3.5 hover:bg-zinc-50 transition-colors flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">{job.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{job.candidates_count || 0} candidates</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        job.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                      }`}>{job.status}</span>
                    </button>
                  )) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-zinc-500">No jobs yet</p>
                      <button onClick={() => navigate("/jobs/new")} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
                        Create your first job post
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}
                className="bg-white border border-zinc-200 rounded-lg" data-testid="recent-candidates-section">
                <div className="p-5 border-b border-zinc-100">
                  <h3 className="font-['Outfit'] text-base font-medium text-zinc-950">Recent Candidates</h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {stats?.recent_candidates?.length > 0 ? stats.recent_candidates.map((cand) => (
                    <div key={cand.id} className="px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700">
                          {cand.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{cand.name}</p>
                          <p className="text-xs text-zinc-500">{cand.current_company} &middot; {cand.experience}y exp</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-700">{cand.match_score}%</span>
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-zinc-500">No candidates yet. Source candidates from a job post.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
