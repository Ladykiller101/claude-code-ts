import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google";

// GET /api/google/sheets?id=SPREADSHEET_ID&range=Sheet1!A1:Z100
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("id");
    const range = searchParams.get("range") || "Sheet1";

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Missing 'id' parameter (spreadsheet ID)" }, { status: 400 });
    }

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return NextResponse.json({
      range: response.data.range,
      values: response.data.values || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read spreadsheet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/google/sheets — Write data to a spreadsheet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spreadsheetId, range, values } = body as {
      spreadsheetId: string;
      range: string;
      values: string[][];
    };

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: "Missing required fields: spreadsheetId, range, values" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write spreadsheet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
