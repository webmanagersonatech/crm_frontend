"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Cloud, Database, Cpu } from "lucide-react";
import { toast } from "react-toastify";
import { loginRequest } from "./lib/request/authRequest";
import CryptoJS from "crypto-js";

const SECRET_KEY = "sonacassecretkey@2025";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const encryptedPassword = CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
      const response = await loginRequest(email, encryptedPassword);
      if (response.token) {
        localStorage.setItem("token", response.token);
        toast.success("Login successful!");
        router.replace("/dashboard");
      } else {
        toast.error("Invalid response from server.");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-row-reverse bg-slate-50 dark:bg-slate-950">
      {/* RIGHT: sign-in form */}
      <main className="relative overflow-hidden flex w-full lg:w-[44%] flex-col justify-between px-6 sm:px-12 py-8">
        {/* Tech dot-grid background */}
        <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-15 [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <header className="relative flex items-center gap-3">
          <img
            src="/sonastar-logo.png"
            alt="Sona"
            className="h-10 w-auto object-contain"
          />
          <span className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            HIKA CRM
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1.5  border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Centralised data
          </span>
        </header>

        <div className="relative w-full max-w-sm mx-auto py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Sign in to your workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage leads, follow-ups and admissions in one place.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15"
                  placeholder="you@sonastar.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600/30"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                  />
                </svg>
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <footer className="relative space-y-4">
        
          <p className="text-xs text-slate-400 text-center lg:text-left">
            © {new Date().getFullYear()} Sona. All rights reserved.
          </p>
        </footer>
      </main>

      {/* LEFT: background image + promo text */}
    <aside
  className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden p-12"
>
  {/* background image (turned gray) */}
  <div
    className="absolute inset-0 bg-cover bg-center grayscale"
    style={{ backgroundImage: "url('/background.jpg')" }}
  />

  {/* gray overlay so text is readable */}
  <div className="absolute inset-0 bg-gray-900/70" />

  {/* content */}
  <div className="relative max-w-md text-center text-white space-y-6">
    <h2 className="text-3xl font-bold">Transform Your Future with Sona!</h2>
    <p className="text-gray-200 text-base">
      Join our growing network of professionals, explore learning opportunities,
      and take your next big step toward success.
    </p>
    <div className="flex justify-center gap-4 pt-2">
      <button
        type="button"
        className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
      >
        Get Started →
      </button>
      <button
        type="button"
        className="border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-gray-900 transition"
      >
        Learn More
      </button>
    </div>
  </div>
</aside>
    </div>
  );
}