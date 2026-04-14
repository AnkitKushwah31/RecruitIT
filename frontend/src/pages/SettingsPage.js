import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { User, CreditCard, Bell, CheckCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import api from "../lib/api";
import { toast } from "sonner";

const PLANS = [
  { id: "starter", name: "Starter", price: "$29/mo", features: ["5 Job Posts", "20 Candidates/Job", "AI Screening + Calls"] },
  { id: "professional", name: "Professional", price: "$79/mo", features: ["25 Job Posts", "100 Candidates/Job", "Advanced AI Agent"], highlight: true },
  { id: "enterprise", name: "Enterprise", price: "$199/mo", features: ["Unlimited Jobs", "Unlimited Candidates", "White-label"] },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [subscribing, setSubscribing] = useState("");

  // Check for payment return
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const payment = searchParams.get("payment");
    if (sessionId && payment === "success") {
      setActiveTab("billing");
      pollPaymentStatus(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      toast.error("Payment status check timed out. Please refresh.");
      setCheckingPayment(false);
      return;
    }
    setCheckingPayment(true);
    try {
      const { data } = await api.get(`/subscription/status/${sessionId}`);
      if (data.payment_status === "paid") {
        toast.success("Payment successful! Your plan has been upgraded.");
        await refreshUser();
        setCheckingPayment(false);
        return;
      }
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch {
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    }
  };

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const { data } = await api.post("/subscription/checkout", {
        plan_id: planId,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error("Failed to start checkout");
      setSubscribing("");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl" data-testid="settings-page">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage your account and subscription</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="bg-zinc-100 h-9 rounded-md">
            <TabsTrigger value="profile" className="text-sm rounded-md data-[state=active]:bg-white" data-testid="tab-profile">
              <User className="w-4 h-4 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-sm rounded-md data-[state=active]:bg-white" data-testid="tab-billing">
              <CreditCard className="w-4 h-4 mr-1.5" /> Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5" data-testid="profile-section">
              <div>
                <Label className="text-sm font-medium text-zinc-700">Name</Label>
                <Input value={user?.name || ""} readOnly className="mt-1.5 h-10 border-zinc-200 bg-zinc-50" />
              </div>
              <div>
                <Label className="text-sm font-medium text-zinc-700">Email</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input value={user?.email || ""} readOnly className="h-10 border-zinc-200 bg-zinc-50 flex-1" />
                  {user?.email_verified ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold shrink-0">Unverified</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-zinc-700">Company</Label>
                <Input value={user?.company || ""} readOnly className="mt-1.5 h-10 border-zinc-200 bg-zinc-50" />
              </div>
              <div>
                <Label className="text-sm font-medium text-zinc-700">Current Plan</Label>
                <p className="mt-1.5 text-sm font-semibold text-zinc-900 capitalize">{user?.subscription?.plan || "Free"}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            {checkingPayment && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3" data-testid="payment-checking">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-sm text-blue-800">Checking payment status...</p>
              </div>
            )}

            <div className="space-y-4" data-testid="billing-section">
              <div className="bg-white border border-zinc-200 rounded-lg p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Current Plan</p>
                <p className="font-['Outfit'] text-xl font-medium text-zinc-950 mt-1 capitalize">{user?.subscription?.plan || "Free"}</p>
                <p className="text-sm text-zinc-600 mt-1">Status: <span className="font-semibold capitalize">{user?.subscription?.status || "active"}</span></p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isCurrentPlan = user?.subscription?.plan === plan.id;
                  return (
                    <div key={plan.id} className={`rounded-lg p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                      plan.highlight ? "border-2 border-zinc-950" : "border-zinc-200"
                    } ${isCurrentPlan ? "bg-zinc-50" : "bg-white"}`} data-testid={`plan-card-${plan.id}`}>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{plan.name}</p>
                      <p className="font-['Outfit'] text-2xl font-medium text-zinc-950 mt-1">{plan.price}</p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-zinc-600 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      {isCurrentPlan ? (
                        <Button disabled className="w-full mt-4 h-8 text-xs rounded-md" data-testid={`current-plan-${plan.id}`}>
                          Current Plan
                        </Button>
                      ) : (
                        <Button onClick={() => handleSubscribe(plan.id)} disabled={!!subscribing}
                          className={`w-full mt-4 h-8 text-xs rounded-md ${plan.highlight ? "bg-zinc-950 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"}`}
                          data-testid={`subscribe-${plan.id}`}>
                          {subscribing === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Upgrade"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
