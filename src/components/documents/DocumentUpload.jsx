"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload";

export default function DocumentUpload({ clients, open, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    category: "autre",
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.name) {
        setFormData({ ...formData, name: selectedFile.name });
      }
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!formData.name) {
        setFormData({ ...formData, name: droppedFile.name });
      }
    }
  }, [formData.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.client_id) return;

    setUploading(true);
    try {
      const file_url = await uploadFile(file, formData.client_id);
      await onSave({
        ...formData,
        file_url,
        status: "en_attente",
      });
      setFile(null);
      setFormData({ name: "", client_id: "", category: "autre" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Uploader un document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-[#4f46e5]"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="mt-3 text-gray-600">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="text-sm text-gray-400 mt-1">ou</p>
                <label className="mt-3 inline-block">
                  <span className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg cursor-pointer hover:bg-[#2d4a6f] transition-colors">
                    Parcourir
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.csv"
                  />
                </label>
              </>
            )}
          </div>

          <div>
            <Label>Nom du document</Label>
            <Input
              className="mt-1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Catégorie</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
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
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              disabled={!file || !formData.client_id || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                "Uploader"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
