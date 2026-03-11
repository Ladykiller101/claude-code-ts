import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/google";

// GET /api/google/gmail — List recent emails
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const query = searchParams.get("q") || "";
    const pageToken = searchParams.get("pageToken") || undefined;

    const gmail = await getGmailClient();

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: query,
      pageToken,
    });

    const messages = listResponse.data.messages || [];

    // Fetch details for each message
    const detailed = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detail.data.snippet,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          labelIds: detail.data.labelIds,
        };
      })
    );

    return NextResponse.json({
      messages: detailed,
      nextPageToken: listResponse.data.nextPageToken,
      resultSizeEstimate: listResponse.data.resultSizeEstimate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/google/gmail — Send an email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message: content, cc, bcc } = body as {
      to: string;
      subject: string;
      message: string;
      cc?: string;
      bcc?: string;
    };

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, message" },
        { status: 400 }
      );
    }

    const gmail = await getGmailClient();

    // Build RFC 2822 email
    const lines = [
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      ...(bcc ? [`Bcc: ${bcc}`] : []),
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      content,
    ];

    const raw = Buffer.from(lines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return NextResponse.json({
      id: response.data.id,
      threadId: response.data.threadId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
