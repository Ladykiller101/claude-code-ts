"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
  FileText,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const safeFmt = (d, fmt) => {
  if (!d) return "--";
  const p = new Date(d);
  return isNaN(p.getTime()) ? "--" : format(p, fmt, { locale: fr });
};

const categoryLabels = {
  facture: "Facture",
  devis: "Devis",
  contrat: "Contrat",
  bulletin_paie: "Bulletin de paie",
  declaration_fiscale: "Declaration fiscale",
  releve_bancaire: "Releve bancaire",
  autre: "Autre",
};

export default function DocumentViewer({ documentId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docData, setDocData] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchPreview = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    setDocData(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/preview`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Impossible de charger le document");
      }
      const data = await res.json();
      setDocData(data);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open && documentId) {
      fetchPreview();
      setFullscreen(false);
    }
    if (!open) {
      setDocData(null);
      setError(null);
    }
  }, [open, documentId, fetchPreview]);

  const handleDownload = () => {
    window.open(`/api/documents/${documentId}/download?download=true`, "_blank");
  };

  const toggleFullscreen = () => {
    setFullscreen((f) => !f);
  };

  const isGoogleDrive = docData?.source === "google_drive";

  const contentClasses = fullscreen
    ? "fixed inset-0 z-[60] flex flex-col bg-[#0a0a0f] border-none rounded-none max-w-none translate-x-0 translate-y-0 left-0 top-0 p-0"
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={
          fullscreen
            ? "fixed inset-0 z-[60] flex flex-col bg-[#0a0a0f] border-none rounded-none !max-w-none !w-full !h-full !translate-x-0 !translate-y-0 !left-0 !top-0 p-0"
            : "max-w-5xl w-[95vw] h-[90vh] flex flex-col bg-[#0a0a0f] border-[#1e1e2e] p-0 gap-0"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-white text-sm font-semibold truncate">
                {docData?.name || "Document"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {docData?.category && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-[#2a2a3e] text-gray-400"
                  >
                    {categoryLabels[docData.category] || docData.category}
                  </Badge>
                )}
                {docData?.created_at && (
                  <span className="text-[11px] text-gray-500">
                    {safeFmt(docData.created_at, "d MMM yyyy")}
                  </span>
                )}
                {isGoogleDrive && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-900/40 text-blue-400 border border-blue-800">
                    Drive
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {docData?.url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-gray-400 hover:text-white h-8 w-8"
                title="Telecharger"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-white h-8 w-8"
              title={fullscreen ? "Quitter le plein ecran" : "Plein ecran"}
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white h-8 w-8"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#060609] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-gray-400 text-sm">Chargement du document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 max-w-sm text-center px-4">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <p className="text-white font-medium">Impossible d'afficher le document</p>
                <p className="text-gray-400 text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPreview}
                  className="mt-2 border-[#2a2a3e] text-gray-300 hover:text-white"
                >
                  Reessayer
                </Button>
              </div>
            </div>
          )}

          {docData && !loading && !error && (
            <>
              {/* Google Drive documents: open in iframe or show link */}
              {isGoogleDrive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                  <ExternalLink className="w-12 h-12 text-blue-400" />
                  <p className="text-white font-medium text-center">
                    Document Google Drive
                  </p>
                  <p className="text-gray-400 text-sm text-center max-w-md">
                    Ce document est heberge sur Google Drive. Cliquez ci-dessous pour l'ouvrir.
                  </p>
                  <Button
                    onClick={() => window.open(docData.url, "_blank")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir dans Google Drive
                  </Button>
                </div>
              )}

              {/* Image files */}
              {!isGoogleDrive && docData.type === "image" && (
                <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={docData.url}
                    alt={docData.name}
                    className="max-w-full max-h-full object-contain rounded"
                    onError={() => setError("Impossible de charger l'image")}
                  />
                </div>
              )}

              {/* PDF files */}
              {!isGoogleDrive && docData.type === "pdf" && (
                <iframe
                  src={docData.url}
                  className="w-full h-full border-0"
                  title={docData.name}
                  onError={() => setError("Impossible de charger le PDF")}
                />
              )}

              {/* Other file types */}
              {!isGoogleDrive && docData.type === "other" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                  <FileText className="w-12 h-12 text-gray-500" />
                  <p className="text-white font-medium text-center">
                    Apercu non disponible
                  </p>
                  <p className="text-gray-400 text-sm text-center max-w-md">
                    Ce type de fichier ne peut pas etre affiche dans le navigateur.
                    Vous pouvez le telecharger pour le consulter.
                  </p>
                  <Button
                    onClick={handleDownload}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Telecharger le document
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
