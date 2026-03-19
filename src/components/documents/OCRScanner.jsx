"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  ScanLine,
  Eye,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,application/pdf";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const STEPS = {
  UPLOAD: "upload",
  PROCESSING: "processing",
  RESULTS: "results",
  ERROR: "error",
};

export default function OCRScanner({ clients, open, onClose, onSave }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    category: "facture",
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetState = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setPreview(null);
    setProgress(0);
    setProgressMessage("");
    setError(null);
    setOcrResult(null);
    setEditMode(false);
    setEditedData(null);
    setShowRawText(false);
    setSaving(false);
    setFormData({ name: "", client_id: "", category: "facture" });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Le fichier est trop volumineux (max 20 MB)");
      return;
    }

    setFile(selectedFile);
    setError(null);

    if (!formData.name) {
      setFormData((prev) => ({ ...prev, name: selectedFile.name }));
    }

    // Generate preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, [formData.name]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const processOCR = async () => {
    if (!file || !formData.client_id) {
      setError("Veuillez sélectionner un fichier et un client");
      return;
    }

    setStep(STEPS.PROCESSING);
    setProgress(10);
    setProgressMessage("Upload du fichier...");

    try {
      // Step 1: Upload the document
      setProgress(20);
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      uploadBody.append("client_id", formData.client_id);
      uploadBody.append("name", formData.name || file.name);
      uploadBody.append("category", formData.category);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadBody,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Erreur lors de l'upload");
      }

      setProgress(40);
      setProgressMessage("Analyse OCR en cours...");

      // Step 2: Run OCR
      const ocrRes = await fetch("/api/documents/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: uploadData.document.id }),
      });

      setProgress(80);
      setProgressMessage("Extraction des données...");

      const ocrData = await ocrRes.json();

      if (!ocrRes.ok) {
        throw new Error(ocrData.error || "Erreur lors du traitement OCR");
      }

      setProgress(100);
      setProgressMessage("Terminé !");

      setOcrResult({
        ...ocrData,
        documentId: uploadData.document.id,
        document: uploadData.document,
      });
      setEditedData(ocrData.structured_data || {});
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(err.message || "Erreur lors du traitement");
      setStep(STEPS.ERROR);
    }
  };

  const handleSave = async () => {
    if (!ocrResult?.documentId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${ocrResult.documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocr_data: editedData,
          status: "traité",
          extracted_data: {
            vendor_name: editedData?.vendor || null,
            invoice_number: editedData?.invoice_number || null,
            invoice_date: editedData?.date || null,
            due_date: editedData?.due_date || null,
            amount_ht: editedData?.subtotal || null,
            amount_tva: editedData?.tax || null,
            amount_ttc: editedData?.total || null,
          },
        }),
      });

      if (res.ok) {
        onSave?.({
          ...ocrResult.document,
          ocr_data: editedData,
          status: "traité",
        });
        handleClose();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateEditedField = (field, value) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditedItem = (index, field, value) => {
    setEditedData((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f0f1a] border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ScanLine className="w-5 h-5 text-indigo-400" />
            Scanner OCR
          </DialogTitle>
        </DialogHeader>

        {/* ---- STEP: UPLOAD ---- */}
        {step === STEPS.UPLOAD && (
          <div className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file
                  ? "border-emerald-500/50 bg-emerald-900/10"
                  : "border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-900/5"
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <FileText className="w-12 h-12 text-emerald-400" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <ScanLine className="w-12 h-12 text-gray-500 mx-auto" />
                  <p className="mt-3 text-gray-400">
                    Glissez votre reçu ou document ici
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    JPEG, PNG, HEIC ou PDF (max 20 MB)
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Parcourir
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Prendre une photo
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_TYPES}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </>
              )}
            </div>

            {/* Form fields */}
            <div>
              <Label className="text-gray-400">Nom du document</Label>
              <Input
                className="mt-1 bg-gray-900/50 border-gray-700 text-white"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Facture restaurant mars 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, client_id: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-gray-900/50 border-gray-700 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-gray-900/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facture">Facture</SelectItem>
                    <SelectItem value="devis">Devis</SelectItem>
                    <SelectItem value="contrat">Contrat</SelectItem>
                    <SelectItem value="bulletin_paie">Bulletin de paie</SelectItem>
                    <SelectItem value="releve_bancaire">Relevé bancaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-700 text-gray-300"
              >
                Annuler
              </Button>
              <Button
                onClick={processOCR}
                disabled={!file || !formData.client_id}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Scanner & Analyser
              </Button>
            </div>
          </div>
        )}

        {/* ---- STEP: PROCESSING ---- */}
        {step === STEPS.PROCESSING && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
              <div
                className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"
              />
              <ScanLine className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
            </div>

            <div>
              <p className="text-white font-medium text-lg">
                {progressMessage}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Veuillez patienter...
              </p>
            </div>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-600 text-xs mt-2">{progress}%</p>
            </div>
          </div>
        )}

        {/* ---- STEP: ERROR ---- */}
        {step === STEPS.ERROR && (
          <div className="py-8 space-y-6">
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-300">
                  Erreur de traitement
                </p>
                <p className="text-sm text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-700 text-gray-300"
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setError(null);
                  setStep(STEPS.UPLOAD);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* ---- STEP: RESULTS ---- */}
        {step === STEPS.RESULTS && ocrResult && (
          <div className="space-y-4 mt-2">
            {/* Success banner */}
            <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-emerald-300 font-medium">
                  Extraction réussie
                </p>
                <p className="text-emerald-400/60 text-xs mt-0.5">
                  Moteur: {ocrResult.ocr_engine === "gemini" ? "Gemini 2.5 Pro" : "Tesseract.js"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                {editMode ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" /> Aperçu
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-1" /> Modifier
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Structured data */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Données extraites
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FieldRow
                  label="Fournisseur"
                  value={editedData?.vendor}
                  field="vendor"
                  editMode={editMode}
                  onChange={updateEditedField}
                />
                <FieldRow
                  label="N° Facture"
                  value={editedData?.invoice_number}
                  field="invoice_number"
                  editMode={editMode}
                  onChange={updateEditedField}
                />
                <FieldRow
                  label="Date"
                  value={editedData?.date}
                  field="date"
                  editMode={editMode}
                  onChange={updateEditedField}
                  type="date"
                />
                <FieldRow
                  label="Échéance"
                  value={editedData?.due_date}
                  field="due_date"
                  editMode={editMode}
                  onChange={updateEditedField}
                  type="date"
                />
                <FieldRow
                  label="Sous-total HT"
                  value={editedData?.subtotal}
                  field="subtotal"
                  editMode={editMode}
                  onChange={updateEditedField}
                  type="number"
                />
                <FieldRow
                  label="TVA"
                  value={editedData?.tax}
                  field="tax"
                  editMode={editMode}
                  onChange={updateEditedField}
                  type="number"
                />
                <div className="col-span-2">
                  <FieldRow
                    label="Total TTC"
                    value={editedData?.total}
                    field="total"
                    editMode={editMode}
                    onChange={updateEditedField}
                    type="number"
                    highlight
                  />
                </div>
              </div>

              {/* Line items */}
              {editedData?.items?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Articles / Lignes
                  </h4>
                  <div className="space-y-2">
                    {editedData.items.map((item, i) => (
                      <div
                        key={i}
                        className="bg-gray-800/50 rounded-lg p-3 grid grid-cols-4 gap-2 text-sm"
                      >
                        {editMode ? (
                          <>
                            <Input
                              className="col-span-2 bg-gray-900 border-gray-700 text-white text-sm h-8"
                              value={item.description || ""}
                              onChange={(e) =>
                                updateEditedItem(i, "description", e.target.value)
                              }
                              placeholder="Description"
                            />
                            <Input
                              className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                              type="number"
                              value={item.quantity ?? ""}
                              onChange={(e) =>
                                updateEditedItem(i, "quantity", parseFloat(e.target.value) || null)
                              }
                              placeholder="Qté"
                            />
                            <Input
                              className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                              type="number"
                              step="0.01"
                              value={item.amount ?? ""}
                              onChange={(e) =>
                                updateEditedItem(i, "amount", parseFloat(e.target.value) || null)
                              }
                              placeholder="Montant"
                            />
                          </>
                        ) : (
                          <>
                            <span className="col-span-2 text-gray-300">
                              {item.description || "—"}
                            </span>
                            <span className="text-gray-400">
                              x{item.quantity ?? "—"}
                            </span>
                            <span className="text-white font-medium text-right">
                              {item.amount != null
                                ? `${item.amount.toFixed(2)} ${editedData.currency || "€"}`
                                : "—"}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Raw text toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showRawText ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Texte brut extrait
              </button>
              {showRawText && (
                <pre className="mt-2 bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-xs text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {ocrResult.text || "Aucun texte extrait"}
                </pre>
              )}
            </div>

            {/* PDF link */}
            {ocrResult.pdf_url && (
              <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-blue-300 text-sm">PDF généré avec le texte OCR</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(ocrResult.pdf_url, "_blank")}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Eye className="w-4 h-4 mr-1" /> Voir
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-700 text-gray-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Valider et sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Field row sub-component
// ---------------------------------------------------------------------------
function FieldRow({ label, value, field, editMode, onChange, type = "text", highlight = false }) {
  const displayValue = value != null && value !== "" ? String(value) : "—";

  if (editMode) {
    return (
      <div>
        <Label className="text-gray-500 text-xs">{label}</Label>
        <Input
          className={`mt-1 bg-gray-900 border-gray-700 text-white text-sm ${
            highlight ? "border-indigo-600/50 font-semibold" : ""
          }`}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          value={value ?? ""}
          onChange={(e) => {
            const v =
              type === "number"
                ? e.target.value === ""
                  ? null
                  : parseFloat(e.target.value)
                : e.target.value;
            onChange(field, v);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p
        className={`mt-1 text-sm ${
          highlight
            ? "text-white font-semibold text-lg"
            : value
            ? "text-gray-200"
            : "text-gray-600"
        }`}
      >
        {type === "number" && value != null ? parseFloat(value).toFixed(2) : displayValue}
      </p>
    </div>
  );
}
