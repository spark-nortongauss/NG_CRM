"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-store";

type FlowStep = "login" | "forgot-email" | "forgot-otp" | "forgot-reset" | "forgot-success";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const { error, isLoading, setError, setLoading } = useAuth();

  // ---------- Login Handler ----------
  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Client-side domain validation
    const email = formData.get("email") as string;
    if (!email || !email.trim().toLowerCase().endsWith("@nortongauss.com")) {
      setError("Only @nortongauss.com email addresses are allowed.");
      setLoading(false);
      return;
    }

    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      window.location.href = "/home";
    }
  }

  // ---------- Forgot Password Handlers ----------
  function handleForgotClick() {
    setFlowStep("forgot-email");
    setForgotEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setForgotSuccess(null);
  }

  function handleBackToLogin() {
    setFlowStep("login");
    setForgotEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setForgotSuccess(null);
  }

  async function handleSendOtp() {
    setForgotError(null);
    setForgotSuccess(null);

    const trimmedEmail = forgotEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setForgotError("Please enter your email address.");
      return;
    }

    if (!trimmedEmail.endsWith("@nortongauss.com")) {
      setForgotError("Only @nortongauss.com email addresses are allowed.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Failed to send OTP.");
      } else {
        setForgotSuccess("OTP sent to your email!");
        setFlowStep("forgot-otp");
        setForgotError(null);
      }
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setForgotError(null);
    setForgotSuccess(null);

    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      setForgotError("Please enter the OTP.");
      return;
    }

    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      setForgotError("OTP must be exactly 6 digits.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: trimmedOtp,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Invalid OTP.");
      } else {
        setForgotSuccess("OTP verified!");
        setFlowStep("forgot-reset");
        setForgotError(null);
      }
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPassword() {
    setForgotError(null);
    setForgotSuccess(null);

    if (!newPassword) {
      setForgotError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setForgotError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Failed to reset password.");
      } else {
        setFlowStep("forgot-success");
        setForgotError(null);
      }
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  // ---------- Render Helpers ----------

  function renderStepIndicator() {
    const steps = [
      { key: "forgot-email", label: "Email", icon: Mail },
      { key: "forgot-otp", label: "OTP", icon: KeyRound },
      { key: "forgot-reset", label: "Reset", icon: ShieldCheck },
    ];
    const currentIndex = steps.findIndex((s) => s.key === flowStep);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex || flowStep === "forgot-success";
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-ng-teal text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 transition-all duration-300 ${isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderForgotPasswordFlow() {
    return (
      <div className="space-y-5">
        {/* Back to Login */}
        <button
          type="button"
          onClick={handleBackToLogin}
          className="flex items-center gap-1.5 text-sm text-ng-teal hover:text-ng-teal/80 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div>
          <h2 className="text-2xl font-bold text-ng-teal font-primary">
            Reset Password
          </h2>
          <p className="mt-1 text-sm text-ng-gray">
            {flowStep === "forgot-email" && "Enter your registered email to receive a one-time password."}
            {flowStep === "forgot-otp" && "Enter the 6-digit OTP sent to your email."}
            {flowStep === "forgot-reset" && "Create your new password."}
          </p>
        </div>

        {/* Step Indicator */}
        {flowStep !== "forgot-success" && renderStepIndicator()}

        {/* Step 1: Email Input */}
        {flowStep === "forgot-email" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@nortongauss.com"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setForgotError(null);
                }}
                disabled={forgotLoading}
                autoComplete="email"
                className="h-11 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              />
            </div>

            {forgotError && renderError(forgotError)}

            <Button
              type="button"
              onClick={handleSendOtp}
              className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
              disabled={forgotLoading}
            >
              {forgotLoading ? renderSpinner("Sending OTP...") : "Send OTP"}
            </Button>
          </div>
        )}

        {/* Step 2: OTP Input */}
        {flowStep === "forgot-otp" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp-input" className="text-sm font-medium text-gray-700">
                One-Time Password
              </Label>
              <Input
                id="otp-input"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => {
                  // Only allow digits, max 6
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                  setForgotError(null);
                }}
                disabled={forgotLoading}
                maxLength={6}
                className="h-11 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                OTP sent to <span className="font-medium text-ng-teal">{forgotEmail}</span>
              </p>
            </div>

            {forgotError && renderError(forgotError)}

            <Button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
              disabled={forgotLoading}
            >
              {forgotLoading ? renderSpinner("Verifying...") : "Verify OTP"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setFlowStep("forgot-email");
                setOtp("");
                setForgotError(null);
              }}
              className="w-full text-center text-sm text-ng-gray hover:text-ng-teal transition-colors"
            >
              Didn&apos;t receive it? Send again
            </button>
          </div>
        )}

        {/* Step 3: New Password */}
        {flowStep === "forgot-reset" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setForgotError(null);
                  }}
                  disabled={forgotLoading}
                  autoComplete="new-password"
                  className="h-11 pr-10 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setForgotError(null);
                  }}
                  disabled={forgotLoading}
                  autoComplete="new-password"
                  className="h-11 pr-10 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {forgotError && renderError(forgotError)}

            <Button
              type="button"
              onClick={handleResetPassword}
              className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
              disabled={forgotLoading}
            >
              {forgotLoading ? renderSpinner("Resetting...") : "Reset Password"}
            </Button>
          </div>
        )}

        {/* Success */}
        {flowStep === "forgot-success" && (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Password Reset Successful!</h3>
              <p className="text-sm text-gray-500 mt-1">
                You can now sign in with your new password.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleBackToLogin}
              className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderError(message: string) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200 flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        {message}
      </div>
    );
  }

  function renderSpinner(text: string) {
    return (
      <span className="flex items-center justify-center gap-2">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {text}
      </span>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image Panel */}
      <div className="relative hidden lg:flex lg:w-1/2 items-end">
        <Image
          src="/bg.jpg"
          alt="Norton-Gauss"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Logo on top-left */}
        <div className="absolute top-8 left-8 z-10">
          <Image
            src="/Norton-Gauss_Main_Logo_1100x875.png"
            alt="Norton-Gauss Logo"
            width={140}
            height={111}
            className="object-contain brightness-0 invert"
            priority
          />
        </div>

        {/* Tagline at bottom */}
        <div className="relative z-10 p-10 pb-12">
          <h2 className="text-3xl font-bold text-white font-primary leading-tight">
            Smarter CRM.
          </h2>
          <h2 className="text-3xl font-bold text-ng-yellow font-primary leading-tight">
            Stronger Relationships.
          </h2>
          <p className="mt-3 text-white/80 text-base max-w-md">
            Manage your leads, close more deals, and grow your business — all in one place.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form / Forgot Password Flow */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Branding */}
          <div className="text-center lg:text-left">
            {/* Mobile logo (hidden on desktop since it's on the left panel) */}
            <div className="mb-6 flex justify-center lg:hidden">
              <Image
                src="/Norton-Gauss_Main_Logo_1100x875.png"
                alt="Norton-Gauss Logo"
                width={100}
                height={79}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tight font-primary">
              <span className="text-ng-teal">Norton</span>
              <span className="text-ng-teal font-extrabold">-Gauss</span>
              <span className="text-ng-gray text-lg font-normal ml-2">CRM</span>
            </h1>
            <p className="mt-2 text-ng-gray text-sm">
              {flowStep === "login"
                ? "Sign in to your account to continue"
                : "Reset your account password"}
            </p>
          </div>

          {/* Conditional Rendering: Login vs Forgot Password */}
          {flowStep === "login" ? (
            /* ========== LOGIN FORM ========== */
            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@nortongauss.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 pr-10 border-gray-300 bg-gray-50 focus:border-ng-teal focus:ring-ng-teal focus:bg-white transition-colors"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-ng-teal focus:ring-ng-teal"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotClick}
                  className="text-sm font-medium text-ng-teal hover:text-ng-teal/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error && renderError(error)}

              <Button
                type="submit"
                className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? renderSpinner("Signing in...") : "Sign In"}
              </Button>
            </form>
          ) : (
            /* ========== FORGOT PASSWORD FLOW ========== */
            renderForgotPasswordFlow()
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 pt-4">
            &copy; {new Date().getFullYear()} Norton-Gauss. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
