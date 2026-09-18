import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function GET(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      supplierCode: session.supplierCode || null,
      supplierName: session.supplierName || null,
      department: session.department || null,
    },
  });
}
