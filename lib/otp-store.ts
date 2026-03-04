/**
 * In-memory OTP store for password reset flow.
 * OTPs expire after 5 minutes.
 * 
 * NOTE: This store lives in the server process memory.
 * It will be cleared on server restart, which is acceptable for this use case.
 */

interface OtpEntry {
    otp: string;
    email: string;
    expiresAt: number; // Unix timestamp in ms
    verified: boolean;
    resetToken: string | null;
}

const otpStore = new Map<string, OtpEntry>();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random 6-digit OTP
 */
export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store an OTP for an email address.
 * Overwrites any existing OTP for the same email (only latest OTP is valid).
 */
export function storeOtp(email: string, otp: string): void {
    // Clean up any existing entry for this email
    otpStore.set(email.toLowerCase(), {
        otp,
        email: email.toLowerCase(),
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        verified: false,
        resetToken: null,
    });
}

/**
 * Verify an OTP for a given email.
 * Returns true if the OTP is valid and not expired.
 */
export function verifyOtp(email: string, otp: string): { valid: boolean; error?: string } {
    const entry = otpStore.get(email.toLowerCase());

    if (!entry) {
        return { valid: false, error: "No OTP found for this email. Please request a new one." };
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, error: "OTP has expired. Please request a new one." };
    }

    if (entry.otp !== otp) {
        return { valid: false, error: "Invalid OTP. Please check and try again." };
    }

    // Mark as verified and generate a reset token
    const resetToken = crypto.randomUUID();
    entry.verified = true;
    entry.resetToken = resetToken;
    otpStore.set(email.toLowerCase(), entry);

    return { valid: true };
}

/**
 * Get the reset token for a verified email.
 */
export function getResetToken(email: string): string | null {
    const entry = otpStore.get(email.toLowerCase());
    if (!entry || !entry.verified || !entry.resetToken) return null;
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return null;
    }
    return entry.resetToken;
}

/**
 * Validate a reset token for a given email.
 */
export function validateResetToken(email: string, token: string): boolean {
    const entry = otpStore.get(email.toLowerCase());
    if (!entry || !entry.verified || entry.resetToken !== token) return false;
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return false;
    }
    return true;
}

/**
 * Remove the OTP entry for an email (cleanup after password reset).
 */
export function clearOtp(email: string): void {
    otpStore.delete(email.toLowerCase());
}

/**
 * Periodic cleanup of expired entries (optional, called on each store/verify).
 */
export function cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
        if (now > entry.expiresAt) {
            otpStore.delete(key);
        }
    }
}
