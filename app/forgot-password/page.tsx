"use client";

import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Mail, Lock, KeyRound } from "lucide-react";
import CryptoJS from "crypto-js";

import { sendOtp, verifyOtp } from "../lib/request/otpRequest";
import { changePasswordRequest } from "../lib/request/authRequest";

const SECRET_KEY = "sonacassecretkey@2025";

export default function ForgotPasswordPage() {
  /* ----------------------------------------------------------
      STATE — SAFE INITIAL VALUES (Fixes Hydration Error)
  ---------------------------------------------------------- */
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------------
      ON MOUNT — Load saved step + email from localStorage
  ---------------------------------------------------------- */
  useEffect(() => {
    const savedStep = Number(localStorage.getItem("forgot_step")) || 1;
    const savedEmail = localStorage.getItem("forgot_email") || "";

    setStep(savedStep);
    setEmail(savedEmail);
  }, []);

  const saveProgress = (nextStep: number, emailValue: string) => {
    localStorage.setItem("forgot_step", String(nextStep));
    localStorage.setItem("forgot_email", emailValue);
  };

  /* ----------------------------------------------------------
      STEP 1 — SEND OTP
  ---------------------------------------------------------- */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return toast.error("Enter your email");

    try {
      setLoading(true);
      await sendOtp({ email });
      toast.success("OTP sent successfully!");

      saveProgress(2, email);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
      STEP 2 — VERIFY OTP
  ---------------------------------------------------------- */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) return toast.error("Enter the OTP");

    try {
      setLoading(true);
      await verifyOtp({ email, otp });

      toast.success("OTP Verified!");
      saveProgress(3, email);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
      STEP 3 — CHANGE PASSWORD
  ---------------------------------------------------------- */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword)
      return toast.error("Please fill all fields");

    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match");

    try {
      setLoading(true);

      const encryptedNew = CryptoJS.AES.encrypt(newPassword, SECRET_KEY).toString();
      const encryptedConfirm = CryptoJS.AES.encrypt(confirmPassword, SECRET_KEY).toString();

      await changePasswordRequest({
        email,
        newPassword: encryptedNew,
        confirmPassword: encryptedConfirm,
      });

      toast.success("Password updated successfully!");

      localStorage.removeItem("forgot_step");
      localStorage.removeItem("forgot_email");

      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
      UI
  ---------------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-blue-100 p-8">

        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 text-white p-3 rounded-full mb-3">
            {step === 1 ? <Mail className="w-6 h-6" /> :
             step === 2 ? <KeyRound className="w-6 h-6" /> :
             <Lock className="w-6 h-6" />}
          </div>

          <h1 className="text-2xl font-semibold text-gray-800">
            {step === 1 && "Forgot Password"}
            {step === 2 && "Verify OTP"}
            {step === 3 && "Change Password"}
          </h1>

          <p className="text-gray-500 text-sm mt-1 text-center">
            {step === 1 && "Enter your registered email to receive an OTP."}
            {step === 2 && `Enter the OTP sent to ${email}.`}
            {step === 3 && "Enter your new password below."}
          </p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center border rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="email"
                  className="w-full outline-none text-gray-700 text-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium transition"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 text-sm"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium transition"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium transition"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        )}

        <div className="text-center mt-5">
          <a href="/login" className="text-blue-600 hover:underline text-sm font-medium">
            Back to Login
          </a>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}
