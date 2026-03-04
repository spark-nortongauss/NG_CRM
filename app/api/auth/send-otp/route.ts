import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtp, storeOtp, cleanupExpired } from "@/lib/otp-store";

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        // Validate email is provided
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required." },
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

        // Check if user exists in Supabase auth
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

        const userExists = users.users.some(
            (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (!userExists) {
            return NextResponse.json(
                { error: "No account found with this email address." },
                { status: 404 }
            );
        }

        // Clean up expired OTPs
        cleanupExpired();

        // Generate and store OTP
        const otp = generateOtp();
        storeOtp(normalizedEmail, otp);

        // Send OTP via SMTP email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: normalizedEmail,
            subject: "Norton-Gauss CRM - Password Reset OTP",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f9f9f9;">
          <div style="background-color: #2D4344; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Norton-Gauss CRM</h1>
          </div>
          <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #2D4344; margin-top: 0; font-size: 18px;">Password Reset Request</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              You have requested to reset your password. Use the OTP below to proceed:
            </p>
            <div style="background-color: #f0f7f7; border: 2px dashed #2D4344; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2D4344;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 12px; line-height: 1.5;">
              This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.<br/>
              If you did not request this, please ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 16px;">
            &copy; ${new Date().getFullYear()} Norton-Gauss. All rights reserved.
          </p>
        </div>
      `,
        });

        return NextResponse.json(
            { message: "OTP sent successfully to your email." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Send OTP error:", error);
        return NextResponse.json(
            { error: "Failed to send OTP. Please try again later." },
            { status: 500 }
        );
    }
}
