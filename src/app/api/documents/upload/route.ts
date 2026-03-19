import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDriveClient, isGoogleConnected } from "@/lib/google";
import { Readable } from "stream";

// Helper: race a promise against a timeout so Drive calls can't hang forever
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("client_id") as string;
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (bufferErr) {
      console.error("Failed to read file buffer:", bufferErr);
      return NextResponse.json(
        { error: "Impossible de lire le fichier" },
        { status: 400 }
      );
    }

    // 1. Upload to Supabase Storage
    const prefix = clientId || "general";
    const fileName = `${prefix}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", uploadError);
      return NextResponse.json(
        { error: `Upload echoue: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);

    // 2. Also upload to Google Drive if connected and client has a folder
    //    This is best-effort with a 15-second timeout so it can't block the response
    let driveFileId: string | null = null;
    let driveWebViewLink: string | null = null;

    if (clientId) {
      try {
        const connected = await withTimeout(
          isGoogleConnected(),
          5000,
          "Google connection check"
        );
        if (connected) {
          const { data: client } = await supabase
            .from("clients")
            .select("drive_folder_id")
            .eq("id", clientId)
            .single();

          if (client?.drive_folder_id) {
            const drive = await withTimeout(
              getDriveClient(),
              5000,
              "Google Drive client init"
            );
            const fileMetadata: Record<string, unknown> = {
              name: name || file.name,
              parents: [client.drive_folder_id],
            };

            const driveResponse = await withTimeout(
              drive.files.create({
                requestBody: fileMetadata,
                media: {
                  mimeType: file.type,
                  body: Readable.from(buffer),
                },
                fields: "id, webViewLink",
              }),
              15000,
              "Google Drive file upload"
            );

            driveFileId = driveResponse.data.id ?? null;
            driveWebViewLink = driveResponse.data.webViewLink ?? null;
          }
        }
      } catch (driveErr) {
        // Drive upload is best-effort — don't fail the whole upload
        console.warn("Google Drive upload failed (non-blocking):", driveErr);
      }
    }

    // 3. Create document record with both sources
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        name: name || file.name,
        client_id: clientId || null,
        category: category || "autre",
        file_url: urlData.publicUrl,
        status: "en_attente",
        source: "upload",
        drive_file_id: driveFileId,
        drive_web_view_link: driveWebViewLink,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert failed after successful storage upload:", dbError);
      return NextResponse.json(
        { error: `Erreur base de donnees: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: doc,
      drive_uploaded: !!driveFileId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
