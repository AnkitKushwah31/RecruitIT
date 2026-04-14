import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search as SearchIcon, Phone, Zap, Mail, UserCheck, UserX, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import api from "../lib/api";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

const STATUS_COLORS = {
  sourced: "bg-zinc-100 text-zinc-800",
  shortlisted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  hold: "bg-amber-100 text-amber-800",
  screening: "bg-blue-100 text-blue-800",
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourcing, setSourcing] = useState(false);
  const [screening, setScreening] = useState({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, candRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/candidates`)
      ]);
      setJob(jobRes.data);
      setCandidates(candRes.data);
    } catch (err) {
      toast.error("Failed to load job");
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  }, [jobId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSource = async () => {
    setSourcing(true);
    try {
      const { data } = await api.post(`/jobs/${jobId}/source-candidates`);
      toast.success(data.message);
      setCandidates(data.candidates);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sourcing failed");
    } finally {
      setSourcing(false);
    }
  };

  const handleScreen = async (candidateId) => {
    setScreening((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const { data } = await api.post(`/candidates/${candidateId}/screen`);
      toast.success(`Screening complete: ${data.recommendation}`);
      fetchData();
    } catch (err) {
      toast.error("Screening failed");
    } finally {
      setScreening((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const handleScreenAll = async () => {
    const unscreened = candidates.filter((c) => c.screening_status === "pending" || c.screening_status === "failed");
    if (unscreened.length === 0) { toast.info("All candidates already screened"); return; }
    toast.info(`Screening ${unscreened.length} candidates...`);
    for (const c of unscreened) {
      await handleScreen(c.id);
    }
    toast.success("All screening complete!");
  };

  const handleSendEmail = async () => {
    const email = job?.hr_email || prompt("Enter HR email:");
    if (!email) return;
    setSendingEmail(true);
    try {
      const { data } = await api.post(`/jobs/${jobId}/send-shortlisted`, { hr_email: email });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const openDetail = (cand) => {
    setSelectedCandidate(cand);
    setShowDetail(true);
  };

  const filtered = candidates.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_company?.toLowerCase().includes(search.toLowerCase())
  );

  const shortlistedCount = candidates.filter((c) => c.status === "shortlisted").length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl" data-testid="job-detail-page">
        <button onClick={() => navigate("/jobs")} className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-950 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>

        {/* Job header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="font-['Outfit'] text-xl sm:text-2xl font-medium tracking-tight text-zinc-950" data-testid="job-title">{job?.title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {job?.location && `${job.location} · `}{job?.job_type} · {job?.experience_min}-{job?.experience_max} yrs
                {job?.salary_range && ` · ${job.salary_range}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job?.skills?.map((skill) => (
                  <span key={skill} className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-800">{skill}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {candidates.length === 0 ? (
                <Button onClick={handleSource} disabled={sourcing} className="bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm h-9"
                  data-testid="source-candidates-btn">
                  {sourcing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sourcing...</> : <><Zap className="w-4 h-4 mr-1.5" /> Source Candidates</>}
                </Button>
              ) : (
                <>
                  <Button onClick={handleScreenAll} variant="outline" className="border-zinc-200 text-sm h-9"
                    data-testid="screen-all-btn">
                    <Zap className="w-4 h-4 mr-1.5" /> Screen All
                  </Button>
                  {shortlistedCount > 0 && (
                    <Button onClick={handleSendEmail} disabled={sendingEmail} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm h-9"
                      data-testid="send-email-btn">
                      {sendingEmail ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
                      Email HR ({shortlistedCount})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 pt-5 border-t border-zinc-100 grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: candidates.length },
              { label: "Screened", value: candidates.filter((c) => c.screening_status === "completed").length },
              { label: "Shortlisted", value: shortlistedCount },
              { label: "Pending", value: candidates.filter((c) => c.screening_status === "pending").length },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{s.label}</p>
                <p className="font-['Outfit'] text-xl font-medium text-zinc-950 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Candidates Table */}
        {candidates.length > 0 && (
          <>
            <div className="mb-4 relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates..." className="pl-9 h-9 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="search-candidates-input" />
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="candidates-table">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 w-[200px]">Candidate</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Match</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Screen Score</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cand, i) => (
                    <TableRow key={cand.id} className="cursor-pointer hover:bg-zinc-50 transition-colors"
                      onClick={() => openDetail(cand)} data-testid={`candidate-row-${cand.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 shrink-0">
                            {cand.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{cand.name}</p>
                            <p className="text-xs text-zinc-500">{cand.current_company} &middot; {cand.experience}y</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={cand.match_score} className="h-1.5" />
                          <span className="text-xs font-semibold text-zinc-700 shrink-0">{cand.match_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cand.screening_score != null ? (
                          <span className="text-sm font-semibold text-zinc-800">{cand.screening_score}/100</span>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[cand.status] || "bg-zinc-100 text-zinc-800"}`}>
                          {cand.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {cand.screening_status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => handleScreen(cand.id)}
                              disabled={screening[cand.id]} className="h-7 text-xs border-zinc-200"
                              data-testid={`screen-btn-${cand.id}`}>
                              {screening[cand.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" /> Screen</>}
                            </Button>
                          )}
                          {cand.screening_status === "completed" && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Done</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </>
        )}

        {/* Candidate Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Outfit'] text-lg font-medium">{selectedCandidate?.name}</DialogTitle>
            </DialogHeader>
            {selectedCandidate && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-zinc-500">Company:</span> <span className="font-medium text-zinc-900">{selectedCandidate.current_company}</span></div>
                  <div><span className="text-zinc-500">Experience:</span> <span className="font-medium text-zinc-900">{selectedCandidate.experience} years</span></div>
                  <div><span className="text-zinc-500">Location:</span> <span className="font-medium text-zinc-900">{selectedCandidate.location}</span></div>
                  <div><span className="text-zinc-500">Email:</span> <span className="font-medium text-zinc-900">{selectedCandidate.email}</span></div>
                  <div><span className="text-zinc-500">Phone:</span> <span className="font-medium text-zinc-900">{selectedCandidate.phone}</span></div>
                  <div><span className="text-zinc-500">Source:</span> <span className="font-medium text-zinc-900">{selectedCandidate.source}</span></div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Match Score</p>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedCandidate.match_score} className="h-2 flex-1" />
                    <span className="text-lg font-semibold text-zinc-950">{selectedCandidate.match_score}%</span>
                  </div>
                </div>

                {selectedCandidate.matching_skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Matching Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.matching_skills.map((s) => (
                        <Badge key={s} variant="secondary" className="rounded-full text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.ai_summary && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">AI Summary</p>
                    <p className="text-sm text-zinc-700">{selectedCandidate.ai_summary}</p>
                  </div>
                )}

                {selectedCandidate.screening_result && (
                  <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Screening Result</p>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[selectedCandidate.screening_result.recommendation] || "bg-zinc-100"}`}>
                        {selectedCandidate.screening_result.recommendation}
                      </span>
                      {selectedCandidate.screening_score != null && (
                        <span className="text-sm font-semibold text-zinc-800">Score: {selectedCandidate.screening_score}/100</span>
                      )}
                    </div>
                    {selectedCandidate.screening_result.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs text-emerald-700 font-semibold mb-1">Strengths</p>
                        <ul className="list-disc list-inside text-xs text-zinc-700 space-y-0.5">
                          {selectedCandidate.screening_result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {selectedCandidate.screening_result.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs text-red-700 font-semibold mb-1">Weaknesses</p>
                        <ul className="list-disc list-inside text-xs text-zinc-700 space-y-0.5">
                          {selectedCandidate.screening_result.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {selectedCandidate.screening_result.notes && (
                      <p className="text-xs text-zinc-600 italic">{selectedCandidate.screening_result.notes}</p>
                    )}
                  </div>
                )}

                {selectedCandidate.screening_transcript && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Screening Transcript</p>
                    <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-700 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {selectedCandidate.screening_transcript}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
