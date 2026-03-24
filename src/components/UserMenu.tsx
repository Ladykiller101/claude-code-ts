"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  LogIn,
} from "lucide-react";

export default function UserMenu() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-sm text-zinc-300"
        style={{ fontFamily: "JetBrains Mono, monospace" }}
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign In
      </button>
    );
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all"
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[11px] font-bold">
            {initials}
          </div>
        )}
        <span
          className="text-xs text-zinc-300 hidden sm:block max-w-[120px] truncate"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {displayName}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(15,15,20,0.98) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-medium text-white truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {user?.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <MenuItem
                icon={<User className="w-4 h-4" />}
                label="Profile"
                onClick={() => {
                  setOpen(false);
                  router.push("/trading/settings");
                }}
              />
              <MenuItem
                icon={<Settings className="w-4 h-4" />}
                label="Settings"
                onClick={() => {
                  setOpen(false);
                  router.push("/trading/settings");
                }}
              />
            </div>

            <div className="border-t border-white/[0.06] py-1">
              <MenuItem
                icon={<LogOut className="w-4 h-4" />}
                label="Sign Out"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                danger
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-400/10"
          : "text-zinc-300 hover:bg-white/[0.04]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
