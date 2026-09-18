import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { DEFAULT_SUPPLIERS } from "@/data/defaultSuppliers";

/**
 * Server-Enforced Supplier Data Scoping API
 * Strictly returns only records belonging to the authenticated supplier.
 */
export async function POST(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  const session = await verifySessionToken(token);
  if (!session || (session.role !== "SUPPLIER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { success: false, error: "Access denied. Supplier role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { purchases = [], bills = [], products = [] } = body;

    const supplierName = session.supplierName || "";
    const supplierCode = session.supplierCode || "";

    // 1. Locate Supplier Profile from Master
    const foundMaster = DEFAULT_SUPPLIERS.find(
      (s) =>
        s[0].toLowerCase() === supplierCode.toLowerCase() ||
        s[1].toLowerCase() === supplierName.toLowerCase()
    );

    const profile = foundMaster
      ? {
          code: foundMaster[0],
          companyName: foundMaster[1],
          contactPerson: foundMaster[2],
          mobile: foundMaster[3],
          email: foundMaster[4],
          gst: foundMaster[5],
          status: foundMaster[6] || "Active",
        }
      : {
          code: supplierCode || "SUP-001",
          companyName: supplierName || session.name,
          contactPerson: session.name,
          email: session.email,
          mobile: "—",
          gst: "—",
          status: "Active",
        };

    // 2. Strict Server-Side Data Isolation:
    // Only return records where the supplier matches the authenticated session
    const isSupplierMatch = (recordSup) => {
      if (!recordSup) return false;
      const cleanRecord = String(recordSup).toLowerCase().trim();
      const cleanTarget = String(profile.companyName).toLowerCase().trim();
      return (
        cleanRecord.includes(cleanTarget) ||
        cleanTarget.includes(cleanRecord) ||
        cleanRecord.includes(profile.code.toLowerCase())
      );
    };

    const isolatedPurchases = purchases.filter((po) => {
      const sup = po.supplier || (Array.isArray(po) ? po[2] : "");
      return isSupplierMatch(sup);
    });

    const isolatedBills = bills.filter((b) => {
      const sup = b.supplierName || b.supplier || "";
      return isSupplierMatch(sup);
    });

    const isolatedProducts = products.filter((p) => {
      const sup = Array.isArray(p) ? p[5] : p.supplier;
      return isSupplierMatch(sup);
    });

    return NextResponse.json({
      success: true,
      supplier: profile,
      data: {
        purchases: isolatedPurchases,
        bills: isolatedBills,
        products: isolatedProducts,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to load supplier workspace data." },
      { status: 500 }
    );
  }
}
