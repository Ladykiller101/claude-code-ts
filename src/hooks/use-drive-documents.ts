"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { Document } from "@/types/database";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
}

interface DriveResponse {
  files: DriveFile[];
  configured: boolean;
  nextPageToken?: string;
  reason?: string;
  folderName?: string;
}

function inferCategory(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("facture") || lower.includes("invoice")) return "facture";
  if (lower.includes("devis") || lower.includes("quote")) return "devis";
  if (lower.includes("contrat") || lower.includes("contract")) return "contrat";
  if (lower.includes("bulletin") || lower.includes("paie")) return "bulletin_paie";
  if (lower.includes("declaration") || lower.includes("fiscal")) return "declaration_fiscale";
  if (lower.includes("releve") || lower.includes("relevé")) return "releve_bancaire";
  return "autre";
}

function driveFileToDocument(file: DriveFile): Document {
  return {
    id: `drive-${file.id}`,
    name: file.name,
    client_id: null,
    category: inferCategory(file.name, file.mimeType),
    status: "synced",
    file_url: file.webViewLink,
    extracted_data: null,
    created_by: null,
    source: "google_drive",
    drive_file_id: file.id,
    drive_web_view_link: file.webViewLink,
    drive_mime_type: file.mimeType,
    drive_modified_time: file.modifiedTime,
    last_synced_at: null,
    created_at: file.createdTime,
    updated_at: file.modifiedTime,
  };
}

export function useDriveDocuments(
  clientId: string | undefined,
  currentUserEmail: string | undefined,
  isFirmUser: boolean
) {
  // Fetch Supabase documents
  const {
    data: dbDocuments = [],
    isLoading: dbLoading,
    error: dbError,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_date"),
  });

  // Fetch live Drive files for the client
  const {
    data: driveData,
    isLoading: driveLoading,
    error: driveError,
  } = useQuery<DriveResponse>({
    queryKey: ["drive-files", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/google/drive/${clientId}`);
      if (!res.ok) return { files: [], configured: false };
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 60_000,
    retry: 1,
  });

  // Merge: db docs + any Drive files not yet synced to Supabase
  const documents = useMemo(() => {
    // Filter Supabase docs by user/client
    const filtered = isFirmUser
      ? dbDocuments
      : dbDocuments.filter(
          (doc) => doc.created_by === currentUserEmail || doc.client_id === clientId
        );

    // If no live Drive data, just return Supabase docs
    if (!driveData?.files?.length) return filtered;

    // Find Drive files not already in Supabase (by drive_file_id)
    const syncedDriveIds = new Set(
      filtered.map((d) => d.drive_file_id).filter(Boolean)
    );

    const unsyncedDriveFiles = driveData.files
      .filter((f) => !syncedDriveIds.has(f.id))
      .map(driveFileToDocument);

    return [...filtered, ...unsyncedDriveFiles];
  }, [dbDocuments, driveData, clientId, currentUserEmail, isFirmUser]);

  return {
    documents,
    isLoading: dbLoading,
    isDriveLoading: driveLoading,
    isDriveConfigured: driveData?.configured ?? false,
    driveReason: driveData?.reason,
    dbError,
    driveError,
  };
}
