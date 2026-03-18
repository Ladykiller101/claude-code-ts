import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, isGoogleConnected } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/google/drive/[clientId] — List Drive files scoped to a client's folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const pageToken = searchParams.get("pageToken") || undefined;
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Check if Google is connected
    const connected = await isGoogleConnected();
    if (!connected) {
      return NextResponse.json({ files: [], configured: false, reason: "google_not_connected" });
    }

    // Look up the client's Drive folder ID
    const supabase = createAdminClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("drive_folder_id, company_name")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ files: [], configured: false, reason: "client_not_found" });
    }

    if (!client.drive_folder_id) {
      return NextResponse.json({ files: [], configured: false, reason: "no_folder_mapped" });
    }

    const drive = await getDriveClient();

    let q = `'${client.drive_folder_id}' in parents and trashed = false`;
    if (query) {
      q += ` and name contains '${query}'`;
    }

    const response = await drive.files.list({
      q,
      pageSize,
      pageToken,
      fields:
        "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, parents, thumbnailLink)",
      orderBy: "modifiedTime desc",
    });

    return NextResponse.json({
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
      configured: true,
      folderName: client.company_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list client Drive files";
    console.error("Drive client route error:", message);
    return NextResponse.json({ error: message, files: [], configured: false }, { status: 500 });
  }
}
