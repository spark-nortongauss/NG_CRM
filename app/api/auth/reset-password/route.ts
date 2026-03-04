import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResetToken, clearOtp } from "@/lib/otp-store";

export async function POST(request: NextRequest) {
    try {
        const { email, newPassword, confirmPassword } = await request.json();

        // Validate inputs
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        if (!newPassword || typeof newPassword !== "string") {
            return NextResponse.json(
                { error: "New password is required." },
                { status: 400 }
            );
        }

        if (!confirmPassword || typeof confirmPassword !== "string") {
            return NextResponse.json(
                { error: "Confirm password is required." },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match." },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters long." },
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

        // Check that OTP was verified for this email
        const resetToken = getResetToken(normalizedEmail);
        if (!resetToken) {
            return NextResponse.json(
                { error: "OTP not verified. Please verify your OTP first." },
                { status: 403 }
            );
        }

        // Find the user by email using Supabase Admin API
        const supabase = createAdminClient();
        const { data: users, error: listError } =
            await supabase.auth.admin.listUsers();

        if (listError) {
            console.error("Error listing users:", listError);
            return NextResponse.json(
                { error: "An error occurred. Please try again later." },
                { status: 500 }
            );
        }

        const user = users.users.find(
            (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (!user) {
            return NextResponse.json(
                { error: "No account found with this email address." },
                { status: 404 }
            );
        }

        // Update the user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error("Error updating password:", updateError);
            return NextResponse.json(
                { error: "Failed to update password. Please try again." },
                { status: 500 }
            );
        }

        // Clean up the OTP entry
        clearOtp(normalizedEmail);

        return NextResponse.json(
            { message: "Password reset successfully. You can now sign in with your new password." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Password reset failed. Please try again." },
            { status: 500 }
        );
    }
}
