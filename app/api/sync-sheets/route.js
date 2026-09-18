import { NextResponse } from "next/server";
import {
  DEFAULT_OFFICIAL_WEBHOOK_URL,
  DEFAULT_OFFICIAL_SPREADSHEET_URL,
} from "@/google_sheets_sync/syncClient";

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
          error:
            "Google Sheets Webhook URL is not configured. Please configure it in Reports & Sync Hub or in .env.local.",
        },
        { status: 400 }
      );
    }

    // Ensure sheetUrl is passed in body if available
    if (!body.sheetUrl) {
      body.sheetUrl =
        process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL ||
        DEFAULT_OFFICIAL_SPREADSHEET_URL;
    }

    // Google Apps Script redirect-following fetch
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (
        text.includes("<html") ||
        text.includes("<!DOCTYPE") ||
        text.includes("accounts.google.com")
      ) {
        return NextResponse.json(
          {
            result: "error",
            error:
              "Google Apps Script returned an authentication or permission error page. Please make sure that your Google Apps Script deployment has 'Execute as: Me' and 'Who has access: Anyone'.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          result: "error",
          error:
            "Invalid response from Google Sheets Webhook: " +
            (text ? text.slice(0, 200) : "empty response"),
        },
        { status: 502 }
      );
    }

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

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        status: "error",
        error:
          "Webhook returned non-JSON. Ensure Apps Script Web App 'Who has access' is set to 'Anyone'.",
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: error.message },
      { status: 500 }
    );
  }
}

