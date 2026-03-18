import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    // Public URL format: /storage/v1/object/public/documents/{path}
    const match = url.pathname.match(/\/object\/(?:public|sign)\/documents\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";
    const supabase = createAdminClient();

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, name, file_url, drive_web_view_link, source, client_id")
      .eq("id", id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Authorization: client users can only access their own documents
    try {
      const serverSupabase = await createClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single();

        if (profile?.role?.startsWith("client_") && doc.client_id && doc.client_id !== profile.company_id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
    } catch {
      // Auth check is best-effort — don't block download if auth lookup fails
    }

    // For uploaded documents, prefer file_url (Supabase storage) over drive_web_view_link
    // For Drive-only documents (source === "google_drive"), use drive_web_view_link

    // Supabase storage documents — generate a signed URL
    if (doc.file_url) {
      const path = extractStoragePath(doc.file_url);
      if (path) {
        // For downloads, set download option so Supabase adds Content-Disposition: attachment
        const downloadOption = isDownload ? (doc.name || true) : undefined;
        const { data: signed, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(path, 3600, {
            download: downloadOption,
          });

        if (!signError && signed?.signedUrl) {
          return NextResponse.redirect(signed.signedUrl);
        }
      }
      // Fallback: redirect to public URL as-is
      return NextResponse.redirect(doc.file_url);
    }

    // Google Drive documents — redirect to Drive viewer
    if (doc.drive_web_view_link) {
      return NextResponse.redirect(doc.drive_web_view_link);
    }

    return NextResponse.json({ error: "No file URL available" }, { status: 404 });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
