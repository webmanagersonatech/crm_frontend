"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { loginRequest } from "./lib/request/authRequest";
import CryptoJS from "crypto-js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const SECRET_KEY = "sonacassecretkey@2025";
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
      console.error("❌ Login failed:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 sm:px-6"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >

      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white/70 dark:bg-neutral-900/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">

        {/* Left side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50 dark:bg-neutral-950">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-8 shadow-md">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img
                src="/sonastar-logo.png"
                alt="Logo"
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="text-right mt-1">
                  <a
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 flex items-center justify-center gap-2 transition"
              >
                {loading && (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        {/* Right side - Image + Promo Section */}
        <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white  p-10 lg:p-12">
          <div className="max-w-md text-center space-y-6">

            <h2 className="text-2xl sm:text-3xl font-bold">
              Transform Your Future with Sona!
            </h2>
            <p className="text-blue-100 text-sm sm:text-base">
              Join our growing network of professionals, explore learning opportunities,
              and take your next big step toward success.
            </p>


            <div className="flex justify-center mt-6 space-x-4">
              <button className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-100 transition">
                Get Started →
              </button>
              <button className="bg-transparent border border-white text-white font-semibold px-6 py-3 rounded-xl hover:bg-white hover:text-blue-700 transition">
                Learn More
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>

  );
}
