"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background Logo with Blur */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="relative h-full w-full">
          <Image
            src="/Norton-Gauss_Main_Logo_1100x875.png"
            alt="Norton-Gauss Background"
            fill
            className="object-contain opacity-10 blur-sm"
            priority
          />
        </div>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/Norton-Gauss_Main_Logo_1100x875.png"
              alt="Norton-Gauss Logo"
              width={120}
              height={95}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Norton-Gauss CRM account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="demo@nortongauss.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
