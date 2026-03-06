import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google";

// GET /api/google/calendar — List upcoming events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || "primary";
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax") || undefined;

    const calendar = getCalendarClient();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({
      events: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list calendar events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/google/calendar — Create an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summary, description, start, end, attendees, calendarId } = body as {
      summary: string;
      description?: string;
      start: string; // ISO 8601
      end: string;
      attendees?: string[];
      calendarId?: string;
    };

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields: summary, start, end" },
        { status: 400 }
      );
    }

    const calendar = getCalendarClient();

    const response = await calendar.events.insert({
      calendarId: calendarId || "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: "Europe/Paris" },
        end: { dateTime: end, timeZone: "Europe/Paris" },
        attendees: attendees?.map((email) => ({ email })),
      },
    });

    return NextResponse.json({
      id: response.data.id,
      htmlLink: response.data.htmlLink,
      summary: response.data.summary,
      start: response.data.start,
      end: response.data.end,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
