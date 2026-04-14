import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/api";
import { motion } from "framer-motion";
import { Briefcase, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-brand-logo">
            <Briefcase className="w-6 h-6 text-zinc-950" strokeWidth={1.5} />
            <span className="font-['Outfit'] text-xl font-semibold tracking-tight text-zinc-950">RecruitIT</span>
          </Link>
          <h1 className="font-['Outfit'] text-3xl font-medium tracking-tight text-zinc-950">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-600">Sign in to your account to continue</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" required className="mt-1.5 h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950"
                data-testid="login-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required
                  className="h-10 border-zinc-200 focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 pr-10"
                  data-testid="login-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-10 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm font-medium"
              data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-zinc-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-zinc-950 font-medium hover:underline" data-testid="login-register-link">Create one</Link>
          </p>
        </motion.div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block relative bg-zinc-950">
        <img src="https://images.unsplash.com/photo-1752170080635-db168448f85d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBvZmZpY2UlMjB0ZWFtfGVufDB8fHx8MTc3NjE2Mjk4NXww&ixlib=rb-4.1.0&q=85"
          alt="Team" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-end p-12">
          <div>
            <p className="font-['Outfit'] text-2xl font-medium text-white tracking-tight">"RecruitIT cut our hiring time by 70%"</p>
            <p className="mt-2 text-sm text-zinc-400">Sarah Chen, VP of People @ TechCorp</p>
          </div>
        </div>
      </div>
    </div>
  );
}
