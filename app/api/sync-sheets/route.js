import { NextResponse } from "next/server";
import { DEFAULT_OFFICIAL_WEBHOOK_URL } from "@/google_sheets_sync/syncClient";

export async function POST(request) {
  try {
    const body = await request.json();
    const webhookUrl =
      body.webhookUrl ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL ||
      DEFAULT_OFFICIAL_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          result: "error",
          error: "Google Sheets Webhook URL is not configured. Please provide NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL or configure it in the app settings.",
        },
        { status: 400 }
      );
    }

    // Google Apps Script redirect-following fetch
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Google Sheets Route Error]", error);
    return NextResponse.json(
      {
        result: "error",
        error: error.message || "Failed to communicate with Google Sheets",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookUrl =
      searchParams.get("webhookUrl") ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL ||
      DEFAULT_OFFICIAL_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { status: "error", error: "No Webhook URL configured" },
        { status: 400 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "GET",
      redirect: "follow",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: error.message },
      { status: 500 }
    );
  }
}
