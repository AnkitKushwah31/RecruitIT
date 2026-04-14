import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Search, Briefcase, Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import api from "../lib/api";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      const { data } = await api.get("/jobs");
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleDelete = async (jobId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this job and all its candidates?")) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success("Job deleted");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl" data-testid="jobs-page">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">Job Posts</h1>
            <p className="mt-1 text-sm text-zinc-600">{jobs.length} total job{jobs.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => navigate("/jobs/new")} className="bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm h-9"
            data-testid="create-job-btn">
            <Plus className="w-4 h-4 mr-1.5" /> New Job Post
          </Button>
        </div>

        <div className="mt-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title or skill..."
            className="pl-9 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
            data-testid="search-jobs-input" />
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-lg p-5 animate-pulse">
                <div className="h-5 w-48 bg-zinc-200 rounded mb-2" />
                <div className="h-3 w-32 bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-12 text-center py-16 bg-white border border-zinc-200 rounded-lg">
            <Briefcase className="w-10 h-10 text-zinc-300 mx-auto" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-zinc-600">
              {search ? "No jobs match your search" : "No job posts yet"}
            </p>
            {!search && (
              <Button onClick={() => navigate("/jobs/new")} className="mt-4 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm">
                Create your first job
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" className="mt-6 space-y-3">
            {filtered.map((job, i) => (
              <motion.div key={job.id} variants={fadeUp} custom={i}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-white border border-zinc-200 rounded-lg p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 group"
                data-testid={`job-card-${job.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-zinc-950 group-hover:text-blue-600 transition-colors truncate">{job.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        job.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                      }`}>{job.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {job.location && `${job.location} · `}{job.job_type} · {job.experience_min}-{job.experience_max} yrs
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.skills?.slice(0, 5).map((skill) => (
                        <span key={skill} className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-800">{skill}</span>
                      ))}
                      {job.skills?.length > 5 && <span className="text-xs text-zinc-400">+{job.skills.length - 5}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-700 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {job.candidates_count || 0}</p>
                      <p className="text-[10px] text-zinc-400">candidates</p>
                    </div>
                    <button onClick={(e) => handleDelete(job.id, e)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      data-testid={`delete-job-${job.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
