"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";

export default function OCRProcessor({ document, open, onClose, onSave }) {
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const processOCR = async () => {
    setProcessing(true);
    setError(null);

    try {
      const result = await callN8n(N8N_WEBHOOKS.chatbot, {
        action: "ocr_extract",
        file_url: document.file_url,
        json_schema: {
          type: "object",
          properties: {
            vendor_name: { type: "string", description: "Nom du fournisseur" },
            invoice_number: { type: "string", description: "Numéro de facture" },
            invoice_date: { type: "string", description: "Date de la facture (format YYYY-MM-DD)" },
            due_date: { type: "string", description: "Date d'échéance (format YYYY-MM-DD)" },
            amount_ht: { type: "number", description: "Montant HT" },
            amount_tva: { type: "number", description: "Montant TVA" },
            amount_ttc: { type: "number", description: "Montant TTC" },
          },
        },
      });

      setExtractedData(result.output || result);
    } catch (err) {
      setError("Erreur lors du traitement OCR");
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...document,
      extracted_data: extractedData,
      status: "traité",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4f46e5]" />
            Extraction OCR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              <strong>Document :</strong> {document?.name}
            </p>
          </div>

          {!extractedData && !processing && !error && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-[#4f46e5] mx-auto opacity-50" />
              <p className="mt-4 text-gray-600">
                L&apos;IA va analyser votre document et extraire automatiquement les données.
              </p>
              <Button
                onClick={processOCR}
                className="mt-4 bg-[#4f46e5] hover:bg-[#6366f1]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Lancer l&apos;extraction
              </Button>
            </div>
          )}

          {processing && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 text-[#4f46e5] animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Analyse en cours...</p>
              <p className="text-sm text-gray-400 mt-1">
                L&apos;IA extrait les données de votre document
              </p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-rose-800">Erreur</p>
                <p className="text-sm text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {extractedData && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600" />
                <p className="text-emerald-800">Extraction réussie !</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Fournisseur</Label>
                  <Input
                    value={extractedData.vendor_name || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, vendor_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">N° Facture</Label>
                  <Input
                    value={extractedData.invoice_number || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, invoice_number: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">Date facture</Label>
                  <Input
                    type="date"
                    value={extractedData.invoice_date || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, invoice_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">Date échéance</Label>
                  <Input
                    type="date"
                    value={extractedData.due_date || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">Montant HT</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.amount_ht || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, amount_ht: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">TVA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.amount_tva || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, amount_tva: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Montant TTC</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.amount_ttc || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, amount_ttc: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Valider et créer la facture
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
