import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, cleanupExpired } from "@/lib/otp-store";

export async function POST(request: NextRequest) {
    try {
        const { email, otp } = await request.json();

        // Validate inputs
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        if (!otp || typeof otp !== "string") {
            return NextResponse.json(
                { error: "OTP is required." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Validate @nortongauss.com domain
        if (!normalizedEmail.endsWith("@nortongauss.com")) {
            return NextResponse.json(
                { error: "Only @nortongauss.com email addresses are allowed." },
                { status: 400 }
            );
        }

        // Clean up expired entries
        cleanupExpired();

        // Verify the OTP
        const result = verifyOtp(normalizedEmail, otp.trim());

        if (!result.valid) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: "OTP verified successfully." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json(
            { error: "Verification failed. Please try again." },
            { status: 500 }
        );
    }
}
