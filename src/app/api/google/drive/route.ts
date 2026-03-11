import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/google";
import { Readable } from "stream";

// GET /api/google/drive — List files or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const folderId = searchParams.get("folderId");
    const pageToken = searchParams.get("pageToken") || undefined;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const drive = await getDriveClient();

    let q = "trashed = false";
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (query) {
      q += ` and name contains '${query}'`;
    }

    const response = await drive.files.list({
      q,
      pageSize,
      pageToken,
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, parents)",
      orderBy: "modifiedTime desc",
    });

    return NextResponse.json({
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/google/drive — Upload a file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const drive = await getDriveClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileMetadata: Record<string, unknown> = {
      name: file.name,
    };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id, name, mimeType, webViewLink",
    });

    return NextResponse.json(response.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
