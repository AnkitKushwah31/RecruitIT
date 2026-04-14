import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/api";
import api from "../lib/api";
import { motion } from "framer-motion";
import { Briefcase, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (user && user.email_verified) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password, form.company);
      setVerificationToken(data.verification_token || "");
      setVerificationStep(true);
      toast.success("Account created! Please verify your email.");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await api.post("/auth/verify-email-json", { token: verificationToken || verifyCode });
      toast.success("Email verified! Redirecting...");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally {
      setVerifying(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="register-brand-logo">
            <Briefcase className="w-6 h-6 text-zinc-950" strokeWidth={1.5} />
            <span className="font-['Outfit'] text-xl font-semibold tracking-tight text-zinc-950">RecruitIT</span>
          </Link>

          {!verificationStep ? (
            <>
              <h1 className="font-['Outfit'] text-3xl font-medium tracking-tight text-zinc-950">Create your account</h1>
              <p className="mt-2 text-sm text-zinc-600">Start automating your hiring process</p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" data-testid="register-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-zinc-700">Full Name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe" required className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                    data-testid="register-name-input" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-700">Work Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com" required className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                    data-testid="register-email-input" />
                </div>
                <div>
                  <Label htmlFor="company" className="text-sm font-medium text-zinc-700">Company</Label>
                  <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme Corp" className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950"
                    data-testid="register-company-input" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="password" type={showPassword ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 6 characters" required
                      className="h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950 pr-10"
                      data-testid="register-password-input" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-10 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm font-medium"
                  data-testid="register-submit-btn">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <p className="mt-6 text-sm text-zinc-600">
                Already have an account?{" "}
                <Link to="/login" className="text-zinc-950 font-medium hover:underline" data-testid="register-login-link">Sign in</Link>
              </p>
            </>
          ) : (
            /* Email Verification Step */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-['Outfit'] text-xl font-medium text-zinc-950">Verify your email</h2>
                  <p className="text-sm text-zinc-600">We sent a verification link to {form.email}</p>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
              )}

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Verification Token</p>
                <p className="text-xs text-zinc-600 break-all font-mono bg-white p-2 rounded border border-zinc-200">{verificationToken}</p>
                <p className="text-xs text-zinc-400 mt-2">For demo: Use this token to verify (in production, this would be sent via email)</p>
              </div>

              <Button onClick={handleVerify} disabled={verifying}
                className="w-full h-10 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium mb-3"
                data-testid="verify-email-btn">
                {verifying ? "Verifying..." : "Verify Email"}
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="w-full text-sm text-zinc-600 hover:text-zinc-950"
                data-testid="skip-verification-btn">
                Skip for now
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:block relative bg-zinc-950">
        <img src="https://images.unsplash.com/photo-1752170080635-db168448f85d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBvZmZpY2UlMjB0ZWFtfGVufDB8fHx8MTc3NjE2Mjk4NXww&ixlib=rb-4.1.0&q=85"
          alt="Team" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-end p-12">
          <div>
            <p className="font-['Outfit'] text-2xl font-medium text-white tracking-tight">"The AI screening saved us 200+ hours last quarter"</p>
            <p className="mt-2 text-sm text-zinc-400">David Park, Head of Talent @ StartupXYZ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
