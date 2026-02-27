import { createClient } from "@/lib/supabase/client";

export async function uploadFile(file: File, clientId?: string): Promise<string> {
  const supabase = createClient();
  const prefix = clientId || "general";
  const fileName = `${prefix}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
