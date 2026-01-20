import { StateCreator } from "zustand";
import { User } from "@supabase/supabase-js";

export interface AuthSlice {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    setUser: (user: User | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    clearAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    user: null,
    isLoading: false,
    error: null,
    setUser: (user) => set({ user, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    clearAuth: () => set({ user: null, error: null, isLoading: false }),
});
