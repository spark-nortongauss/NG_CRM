"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-store";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const { error, isLoading, setError, setLoading } = useAuth();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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

      {/* Right Side - Login Form */}
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
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
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
                className="text-sm font-medium text-ng-teal hover:text-ng-teal/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200 flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-ng-teal hover:bg-ng-teal/90 text-white font-medium text-base transition-all duration-200 hover:shadow-lg rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 pt-4">
            &copy; {new Date().getFullYear()} Norton-Gauss. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

