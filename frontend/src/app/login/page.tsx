"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Video, Loader2, LogIn, UserPlus } from "lucide-react";

import { useAuth } from "@/lib/auth";

const inputCls = [
  "w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] px-3.5 py-2.5",
  "text-[14px] text-[#1A1A1A] placeholder:text-[#ADADAD]",
  "focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/25 focus:border-[#0B5CFF]",
  "transition-all duration-150",
].join(" ");

const primaryBtn = [
  "w-full flex items-center justify-center gap-2 rounded-xl",
  "bg-[#0B5CFF] hover:bg-[#0047e0] active:bg-[#003ccc]",
  "text-white font-semibold text-[14px] py-2.5 transition-colors",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("raj@zoom.local");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#0B5CFF] animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email, password });
        toast.success("Welcome back!");
      } else {
        if (!name.trim()) { toast.error("Please enter your name"); setSubmitting(false); return; }
        await register({ name: name.trim(), email, password });
        toast.success("Account created!");
      }
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="flex items-center justify-center w-10 h-10 rounded-[12px] bg-[#0B5CFF]">
            <Video className="w-6 h-6 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[#1A1A1A] font-bold text-[24px] tracking-[-0.5px]">
            zoom<span className="text-[#0B5CFF]">clone</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-1">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-[13px] text-[#747487] mb-6">
            {mode === "login" ? "Sign in to start or join meetings" : "Register to start using ZoomClone"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#1A1A1A]">Name</label>
                <input
                  className={inputCls}
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1A1A1A]">Email</label>
              <input
                className={inputCls}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={mode === "login"}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1A1A1A]">Password</label>
              <input
                className={inputCls}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" disabled={submitting} className={`mt-2 ${primaryBtn}`}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {submitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-[13px] text-[#0B5CFF] hover:underline font-medium"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-[13px] text-[#747487] hover:text-[#1A1A1A] transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
