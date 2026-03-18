import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, isGoogleConnected } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

function inferCategory(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("facture") || lower.includes("invoice")) return "facture";
  if (lower.includes("devis") || lower.includes("quote")) return "devis";
  if (lower.includes("contrat") || lower.includes("contract")) return "contrat";
  if (lower.includes("bulletin") || lower.includes("paie") || lower.includes("payslip")) return "bulletin_paie";
  if (lower.includes("declaration") || lower.includes("fiscal")) return "declaration_fiscale";
  if (lower.includes("releve") || lower.includes("relevé") || lower.includes("bank")) return "releve_bancaire";
  if (mimeType === "application/pdf") return "autre";
  return "autre";
}

// POST /api/google/drive/sync — Sync Drive files into Supabase documents table
export async function POST(request: NextRequest) {
  try {
    // Parse body once
    const body = await request.json().catch(() => ({}));

    // Verify authorization (Vercel cron or admin flag)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isAdminCall = body.admin === true;

    if (!isCronCall && !isAdminCall && cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetClientId = body.clientId as string | undefined;

    const connected = await isGoogleConnected();
    if (!connected) {
      return NextResponse.json({ error: "Google not connected", synced: 0 });
    }

    const supabase = createAdminClient();
    const drive = await getDriveClient();

    // Fetch clients with Drive folders configured
    let clientsQuery = supabase
      .from("clients")
      .select("id, company_name, drive_folder_id")
      .not("drive_folder_id", "is", null);

    if (targetClientId) {
      clientsQuery = clientsQuery.eq("id", targetClientId);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError || !clients?.length) {
      return NextResponse.json({
        synced: 0,
        message: "No clients with Drive folders configured",
      });
    }

    let totalSynced = 0;
    let totalRemoved = 0;
    const errors: string[] = [];

    for (const client of clients) {
      try {
        // List all files in the client's Drive folder
        let allFiles: Array<{
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          createdTime: string;
          modifiedTime: string;
          webViewLink: string;
        }> = [];
        let pageToken: string | undefined;

        do {
          const response = await drive.files.list({
            q: `'${client.drive_folder_id}' in parents and trashed = false`,
            pageSize: 100,
            pageToken,
            fields:
              "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)",
            orderBy: "modifiedTime desc",
          });

          if (response.data.files) {
            allFiles = allFiles.concat(response.data.files as typeof allFiles);
          }
          pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);

        // Sync each file into the documents table (check exists, then insert or update)
        for (const file of allFiles) {
          const docData = {
            name: file.name,
            client_id: client.id,
            category: inferCategory(file.name, file.mimeType),
            status: "validé",
            file_url: file.webViewLink,
            source: "google_drive" as const,
            drive_file_id: file.id,
            drive_web_view_link: file.webViewLink,
            drive_mime_type: file.mimeType,
            drive_modified_time: file.modifiedTime,
            last_synced_at: new Date().toISOString(),
          };

          // Check if document already exists by drive_file_id
          const { data: existing } = await supabase
            .from("documents")
            .select("id")
            .eq("drive_file_id", file.id)
            .maybeSingle();

          let syncError;
          if (existing) {
            // Update existing
            const { error } = await supabase
              .from("documents")
              .update(docData)
              .eq("id", existing.id);
            syncError = error;
          } else {
            // Insert new
            const { error } = await supabase
              .from("documents")
              .insert(docData);
            syncError = error;
          }

          if (syncError) {
            errors.push(`Sync failed for ${file.name}: ${syncError.message}`);
          } else {
            totalSynced++;
          }
        }

        // Remove documents that no longer exist in Drive
        const driveFileIds = allFiles.map((f) => f.id);
        if (driveFileIds.length > 0) {
          const { data: existingDocs } = await supabase
            .from("documents")
            .select("id, drive_file_id")
            .eq("client_id", client.id)
            .eq("source", "google_drive")
            .not("drive_file_id", "is", null);

          if (existingDocs) {
            const toRemove = existingDocs.filter(
              (doc) => doc.drive_file_id && !driveFileIds.includes(doc.drive_file_id)
            );
            for (const doc of toRemove) {
              await supabase.from("documents").delete().eq("id", doc.id);
              totalRemoved++;
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Client ${client.company_name}: ${msg}`);
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      removed: totalRemoved,
      clients_processed: clients.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Drive sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
