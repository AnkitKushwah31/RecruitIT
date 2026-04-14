import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, LayoutDashboard, FolderOpen, Settings, LogOut, Plus, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/jobs", label: "Job Posts", icon: FolderOpen },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-zinc-50/50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-zinc-200 fixed top-0 left-0 bottom-0 z-40">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="sidebar-logo">
            <Briefcase className="w-5 h-5 text-zinc-950" strokeWidth={1.5} />
            <span className="font-['Outfit'] text-lg font-semibold tracking-tight text-zinc-950">RecruitIT</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive(item.path) ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`} data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-100">
          <Button onClick={() => navigate("/jobs/new")} className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm h-9"
            data-testid="new-job-btn">
            <Plus className="w-4 h-4 mr-1.5" /> New Job Post
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-zinc-200 z-50 lg:hidden">
              <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-zinc-950" strokeWidth={1.5} />
                  <span className="font-['Outfit'] text-lg font-semibold tracking-tight text-zinc-950">RecruitIT</span>
                </Link>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-zinc-500" /></button>
              </div>
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                      isActive(item.path) ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}>
                    <item.icon className="w-4 h-4" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-60">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" data-testid="mobile-menu-btn">
              <Menu className="w-5 h-5 text-zinc-600" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <span className="text-xs text-zinc-500">Plan:</span>
              <span className="text-xs font-semibold text-zinc-800 capitalize">{user?.subscription?.plan || "free"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-950 transition-colors" data-testid="user-menu-trigger">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden sm:inline font-medium">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
