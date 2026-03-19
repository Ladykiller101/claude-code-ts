import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const match = url.pathname.match(/\/object\/(?:public|sign)\/documents\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function getFileType(name: string, mimeType?: string): "pdf" | "image" | "other" {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".pdf") || mimeType?.includes("pdf")) return "pdf";
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    mimeType?.startsWith("image/")
  )
    return "image";
  return "other";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: doc, error } = await supabase
      .from("documents")
      .select(
        "id, name, file_url, drive_web_view_link, source, client_id, category, created_at, drive_mime_type, status"
      )
      .eq("id", id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Authorization check
    try {
      const serverSupabase = await createClient();
      const {
        data: { user },
      } = await serverSupabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single();

        if (
          profile?.role?.startsWith("client_") &&
          doc.client_id &&
          doc.client_id !== profile.company_id
        ) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
    } catch {
      // Auth check is best-effort
    }

    const fileType = getFileType(doc.name, doc.drive_mime_type);

    // Supabase storage documents — generate a signed URL for inline viewing
    if (doc.file_url) {
      const path = extractStoragePath(doc.file_url);
      if (path) {
        const { data: signed, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(path, 3600); // 1 hour, no download disposition

        if (!signError && signed?.signedUrl) {
          return NextResponse.json({
            url: signed.signedUrl,
            name: doc.name,
            category: doc.category,
            type: fileType,
            created_at: doc.created_at,
            source: doc.source || "upload",
          });
        }
      }
      // Fallback: return public URL
      return NextResponse.json({
        url: doc.file_url,
        name: doc.name,
        category: doc.category,
        type: fileType,
        created_at: doc.created_at,
        source: doc.source || "upload",
      });
    }

    // Google Drive documents — return Drive viewer link
    if (doc.drive_web_view_link) {
      return NextResponse.json({
        url: doc.drive_web_view_link,
        name: doc.name,
        category: doc.category,
        type: fileType,
        created_at: doc.created_at,
        source: "google_drive",
      });
    }

    return NextResponse.json({ error: "No file URL available" }, { status: 404 });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
