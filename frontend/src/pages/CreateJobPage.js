import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import api from "../lib/api";
import { toast } from "sonner";

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", skills: [], experience_min: 0, experience_max: 5,
    location: "", job_type: "full-time", salary_range: "", hr_email: ""
  });

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm({ ...form, skills: [...form.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) { toast.error("Title and description are required"); return; }
    if (form.skills.length === 0) { toast.error("Add at least one skill"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/jobs", form);
      toast.success("Job post created!");
      navigate(`/jobs/${data.id}`);
    } catch (err) {
      toast.error("Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl" data-testid="create-job-page">
        <button onClick={() => navigate("/jobs")} className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-950 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">Create Job Post</h1>
          <p className="mt-1 text-sm text-zinc-600">Define the role and our AI agent will source & screen candidates</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
            <div>
              <Label className="text-sm font-medium text-zinc-700">Job Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Senior React Developer" required
                className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="job-title-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={5} required className="mt-1.5 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="job-description-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Skills *</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="Type a skill and press Enter" className="h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                  data-testid="skill-input" />
                <Button type="button" onClick={addSkill} variant="outline" className="h-10 px-3 border-zinc-200"
                  data-testid="add-skill-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-zinc-100 text-zinc-800">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="text-zinc-400 hover:text-zinc-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 grid sm:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-medium text-zinc-700">Min Experience (years)</Label>
              <Input type="number" value={form.experience_min} onChange={(e) => setForm({ ...form, experience_min: parseInt(e.target.value) || 0 })}
                min={0} className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="exp-min-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Max Experience (years)</Label>
              <Input type="number" value={form.experience_max} onChange={(e) => setForm({ ...form, experience_max: parseInt(e.target.value) || 0 })}
                min={0} className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="exp-max-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Bangalore, Remote"
                className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="location-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Job Type</Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger className="mt-1.5 h-10 border-zinc-200" data-testid="job-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">Salary Range</Label>
              <Input value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                placeholder="e.g., 15-25 LPA" className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="salary-input" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700">HR Email</Label>
              <Input type="email" value={form.hr_email} onChange={(e) => setForm({ ...form, hr_email: e.target.value })}
                placeholder="hr@company.com" className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                data-testid="hr-email-input" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm h-10 px-6"
              data-testid="submit-job-btn">
              {loading ? "Creating..." : "Create Job Post"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/jobs")} className="text-sm text-zinc-600">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
