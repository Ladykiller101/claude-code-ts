"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Download,
  FolderOpen,
  Mail,
  Phone,
  MapPin,
  Building,
  RefreshCw,
  HardDrive,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

const safeFmt = (d, fmt) => {
  if (!d) return "—";
  const p = new Date(d);
  return isNaN(p.getTime()) ? "—" : format(p, fmt, { locale: fr });
};

const categoryLabels = {
  facture: "Facture",
  devis: "Devis",
  contrat: "Contrat",
  bulletin_paie: "Bulletin de paie",
  declaration_fiscale: "Déclaration fiscale",
  releve_bancaire: "Relevé bancaire",
  autre: "Autre",
};

const categoryColors = {
  facture: "bg-blue-900/40 text-blue-400 border-blue-800",
  devis: "bg-cyan-900/40 text-cyan-400 border-cyan-800",
  contrat: "bg-purple-900/40 text-purple-400 border-purple-800",
  bulletin_paie: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  declaration_fiscale: "bg-amber-900/40 text-amber-400 border-amber-800",
  releve_bancaire: "bg-indigo-900/40 text-indigo-400 border-indigo-800",
  autre: "bg-gray-800/40 text-gray-400 border-gray-700",
};

function getMimeIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.includes("folder")) return "📁";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("doc") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("image")) return "🖼️";
  return "📄";
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFileState, setUploadFileState] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [uploading, setUploading] = useState(false);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFileState) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFileState);
      formData.append("name", uploadName || uploadFileState.name);
      formData.append("category", uploadCategory);
      formData.append("client_id", id);

      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUpload(false);
      setUploadFileState(null);
      setUploadName("");
      setUploadCategory("autre");
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => db.clients.get(id),
    enabled: !!id,
  });

  const { data: allDocuments = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_at"),
  });

  const documents = allDocuments.filter((d) => d.client_id === id);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/google/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin: true, clientId: id }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (clientLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Client introuvable</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/clients")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux clients
        </Button>
      </div>
    );
  }

  const driveDocuments = documents.filter((d) => d.source === "google_drive");
  const uploadedDocuments = documents.filter((d) => d.source !== "google_drive");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/clients")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{client.company_name}</h1>
          <p className="text-gray-400 mt-1">
            {client.notes || "Dossier client"}
          </p>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-700"
          size="sm"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Envoyer un fichier
        </Button>
        {client.drive_folder_id && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-[#2a2a3e] text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync..." : "Synchroniser"}
          </Button>
        )}
      </div>

      {/* Client Info Card */}
      <Card className="bg-[#13131a] border-[#1e1e2e]">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {client.email && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="truncate">{client.address}</span>
              </div>
            )}
            {client.siret && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Building className="w-4 h-4 text-gray-500" />
                <span>SIRET: {client.siret}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
                client.status === "actif"
                  ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                  : "bg-gray-800/40 text-gray-400 border-gray-700"
              }`}>
                {client.status}
              </span>
              {client.type && (
                <span className="border border-[#2a2a3e] text-[#6a6a8a] text-xs px-2 py-0.5 rounded">
                  {client.type}
                </span>
              )}
            </div>
            {client.drive_folder_id && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Google Drive connecté</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-[#13131a] border-[#1e1e2e]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{documents.length}</p>
            <p className="text-xs text-gray-400 mt-1">Documents total</p>
          </CardContent>
        </Card>
        <Card className="bg-[#13131a] border-[#1e1e2e]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{driveDocuments.length}</p>
            <p className="text-xs text-gray-400 mt-1">Depuis Drive</p>
          </CardContent>
        </Card>
        <Card className="bg-[#13131a] border-[#1e1e2e]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{uploadedDocuments.length}</p>
            <p className="text-xs text-gray-400 mt-1">Uploadés</p>
          </CardContent>
        </Card>
        <Card className="bg-[#13131a] border-[#1e1e2e]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {documents.filter((d) => d.status === "en_attente").length}
            </p>
            <p className="text-xs text-gray-400 mt-1">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer un document au client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
            <div
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) { setUploadFileState(f); if (!uploadName) setUploadName(f.name); }
              }}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                uploadFileState ? "border-emerald-500/50 bg-emerald-900/20" : "border-gray-700 hover:border-purple-500"
              }`}
            >
              {uploadFileState ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <p className="font-medium text-white">{uploadFileState.name}</p>
                    <p className="text-sm text-gray-400">{(uploadFileState.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setUploadFileState(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-500 mx-auto" />
                  <p className="mt-3 text-gray-400">Glissez-déposez votre fichier ici</p>
                  <p className="text-sm text-gray-500 mt-1">ou</p>
                  <label className="mt-3 inline-block">
                    <span className="px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-colors text-sm">
                      Parcourir
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) { setUploadFileState(f); if (!uploadName) setUploadName(f.name); }
                      }}
                      accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.docx"
                    />
                  </label>
                </>
              )}
            </div>
            <div>
              <Label className="text-gray-300">Nom du document</Label>
              <Input
                className="mt-1"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Nom du fichier"
                required
              />
            </div>
            <div>
              <Label className="text-gray-300">Catégorie</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facture">Facture</SelectItem>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="contrat">Contrat</SelectItem>
                  <SelectItem value="bulletin_paie">Bulletin de paie</SelectItem>
                  <SelectItem value="declaration_fiscale">Déclaration fiscale</SelectItem>
                  <SelectItem value="releve_bancaire">Relevé bancaire</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Annuler</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={!uploadFileState || uploading}>
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload en cours...</>
                ) : (
                  "Envoyer"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Documents List */}
      <Card className="bg-[#13131a] border-[#1e1e2e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-400" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun document pour ce client</p>
              {client.drive_folder_id && (
                <p className="text-gray-500 text-sm mt-1">
                  Cliquez sur "Synchroniser" pour importer depuis Google Drive
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded-lg hover:bg-[#1f1f35] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg">{getMimeIcon(doc.drive_mime_type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{doc.name}</p>
                      <p className="text-gray-500 text-xs">
                        {safeFmt(doc.drive_modified_time || doc.created_at, "d MMM yyyy")}
                        {doc.source === "google_drive" && (
                          <span className="ml-2 text-emerald-500">● Drive</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      categoryColors[doc.category] || categoryColors.autre
                    }`}>
                      {categoryLabels[doc.category] || doc.category}
                    </span>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      title="Ouvrir"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
