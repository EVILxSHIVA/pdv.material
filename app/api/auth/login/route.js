import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth/users";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, role, rememberMe } = body;

    // Validate input presence
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter both email and password.",
        },
        { status: 400 }
      );
    }

    // Verify credentials with role match
    const result = verifyCredentials(email, password, role);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 401 }
      );
    }

    const user = result.user;

    // Create cryptographically signed session token
    const token = await createSessionToken(user, !!rememberMe);
    const cookieOptions = getSessionCookieOptions(!!rememberMe);

    // Set HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      message: "Sign in successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        supplierCode: user.supplierCode || null,
        supplierName: user.supplierName || null,
        department: user.department || null,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected server error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
