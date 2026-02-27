"use client";

import React, { useState, useEffect } from "react";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tag,
  AlertTriangle,
  FileText,
  Paperclip,
  Loader2,
  X,
} from "lucide-react";

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "comptabilité",
  priority: "normale",
};

export default function TicketForm({ open, onClose, onSave, clientId, prefillData }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        ...INITIAL_FORM,
        ...(prefillData?.priority && { priority: prefillData.priority }),
      });
      setAttachments([]);
    }
  }, [open, prefillData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const file_url = await uploadFile(file, clientId);
      setAttachments((prev) => [
        ...prev,
        { name: file.name, url: file_url },
      ]);
    } catch (err) {
      console.error("Erreur upload:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const ticketData = {
        ...formData,
        client_id: clientId,
        status: "nouveau",
        source: prefillData?.source || "manual",
        attachments: attachments.length > 0 ? attachments : undefined,
        chatbot_context: prefillData?.chatbot_context || undefined,
        created_at: new Date().toISOString(),
      };

      await onSave(ticketData);
      onClose();
    } catch (err) {
      console.error("Erreur creation ticket:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <Label>Titre *</Label>
            <div className="relative mt-1">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Objet de votre demande"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description *</Label>
            <Textarea
              className="mt-1 min-h-[100px]"
              placeholder="Decrivez votre demande en detail..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <Label>Categorie</Label>
              <div className="relative mt-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comptabilité">Comptabilite</SelectItem>
                    <SelectItem value="fiscal">Fiscal</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="juridique">Juridique</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label>Priorite</Label>
              <div className="relative mt-1">
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <Label>Pieces jointes</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] border border-gray-700 rounded-md cursor-pointer hover:bg-[#1e1e35] transition-colors text-sm text-gray-400">
                <Paperclip className="w-4 h-4" />
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Joindre un fichier"
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[#1a1a2e] px-3 py-1.5 rounded text-sm"
                    >
                      <span className="text-gray-300 truncate">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-gray-500 hover:text-gray-300 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chatbot context notice */}
          {prefillData?.chatbot_context && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-2 text-sm text-indigo-300">
              Ce ticket inclut le contexte de votre conversation avec le chatbot.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={submitting || uploading}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Envoi...
                </>
              ) : (
                "Creer le ticket"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
