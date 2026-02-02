"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Show warning 1 minute before logout

interface IdleLogoutProviderProps {
    children: React.ReactNode;
}

export function IdleLogoutProvider({ children }: IdleLogoutProviderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Don't track on login page
    const isLoginPage = pathname === "/login";

    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
            warningTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    const handleLogout = useCallback(async () => {
        clearAllTimers();
        setShowWarning(false);
        await signOut();
    }, [clearAllTimers]);

    const startCountdown = useCallback(() => {
        setCountdown(60);
        setShowWarning(true);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const resetTimer = useCallback(() => {
        if (isLoginPage) return;

        clearAllTimers();
        setShowWarning(false);
        setCountdown(60);

        // Set warning timeout (14 minutes)
        warningTimeoutRef.current = setTimeout(() => {
            startCountdown();
        }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

        // Set logout timeout (15 minutes)
        timeoutRef.current = setTimeout(() => {
            handleLogout();
        }, IDLE_TIMEOUT_MS);
    }, [isLoginPage, clearAllTimers, startCountdown, handleLogout]);

    const handleStayLoggedIn = useCallback(() => {
        setShowWarning(false);
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        if (isLoginPage) {
            clearAllTimers();
            setShowWarning(false);
            return;
        }

        // Events that indicate user activity
        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click",
            "wheel",
        ];

        // Throttle function to prevent excessive timer resets
        let lastActivity = Date.now();
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastActivity > 1000) { // Only reset if more than 1 second since last activity
                lastActivity = now;
                resetTimer();
            }
        };

        // Add event listeners
        events.forEach((event) => {
            document.addEventListener(event, throttledReset, { passive: true });
        });

        // Start initial timer
        resetTimer();

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, throttledReset);
            });
            clearAllTimers();
        };
    }, [isLoginPage, resetTimer, clearAllTimers]);

    return (
        <>
            {children}

            {/* Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <svg
                                    className="h-6 w-6 text-amber-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Session Timeout Warning
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Your session is about to expire
                                </p>
                            </div>
                        </div>

                        <p className="mb-6 text-gray-600">
                            Due to inactivity, you will be automatically logged out in{" "}
                            <span className="font-bold text-red-600">{countdown}</span> seconds.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleStayLoggedIn}
                                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                                style={{ backgroundColor: '#2D4344' }}
                            >
                                Stay Logged In
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Logout Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
