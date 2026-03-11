import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Upload file to storage
    const prefix = clientId || "general";
    const fileName = `${prefix}/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload echoue: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);

    // Create document record
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        name: name || file.name,
        client_id: clientId || null,
        category: category || "autre",
        file_url: urlData.publicUrl,
        status: "en_attente",
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: `Erreur base de donnees: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
