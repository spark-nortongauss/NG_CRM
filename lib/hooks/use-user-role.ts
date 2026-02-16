"use client";

import { useState, useEffect, useCallback } from "react";

type UserRole = "super_admin" | "user";

interface UserRoleData {
  role: UserRole;
  isSuperAdmin: boolean;
  isUser: boolean;
  isLoading: boolean;
}

let cachedRole: UserRole | null = null;
let fetchPromise: Promise<UserRole> | null = null;

async function fetchUserRole(): Promise<UserRole> {
  if (cachedRole) return cachedRole;

  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/auth/me")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch role");
      return res.json();
    })
    .then((data) => {
      const role = (data.role as UserRole) || "user";
      cachedRole = role;
      fetchPromise = null;
      return role;
    })
    .catch(() => {
      fetchPromise = null;
      return "user" as UserRole;
    });

  return fetchPromise;
}

export function clearRoleCache() {
  cachedRole = null;
  fetchPromise = null;
}

export function useUserRole(): UserRoleData {
  const [role, setRole] = useState<UserRole>(cachedRole || "user");
  const [isLoading, setIsLoading] = useState(!cachedRole);

  useEffect(() => {
    let mounted = true;

    fetchUserRole().then((r) => {
      if (mounted) {
        setRole(r);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    role,
    isSuperAdmin: role === "super_admin",
    isUser: role === "user",
    isLoading,
  };
}
