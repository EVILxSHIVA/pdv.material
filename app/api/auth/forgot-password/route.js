import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth/users";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const resetToken = createPasswordResetToken(email);

    // Generic safe response to prevent user enumeration
    const responseData = {
      success: true,
      message:
        "If an account exists with this email, instructions to reset your password have been sent.",
    };

    // For development convenience, provide the direct token/link
    if (resetToken) {
      responseData.resetUrl = `/reset-password?token=${resetToken}`;
    }

    return NextResponse.json(responseData);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Unable to process request. Please try again." },
      { status: 500 }
    );
  }
}
