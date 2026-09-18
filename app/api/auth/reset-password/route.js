import { NextResponse } from "next/server";
import { resetPasswordWithToken, verifyResetToken } from "@/lib/auth/users";

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing password reset token." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    const email = verifyResetToken(token);
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const success = resetPasswordWithToken(token, newPassword);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to reset password. Please request a new link.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully updated. You can now sign in.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Unable to reset password. Please try again." },
      { status: 500 }
    );
  }
}
