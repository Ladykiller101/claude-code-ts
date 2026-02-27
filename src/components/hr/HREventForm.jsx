"use client";

import React, { useState, useMemo } from "react";
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
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import { differenceInCalendarDays } from "date-fns";

const EVENT_TYPES = [
  { value: "arret_maladie", label: "Arret maladie" },
  { value: "conge_paye", label: "Conge paye" },
  { value: "absence", label: "Absence" },
  { value: "depart", label: "Depart" },
];

export default function HREventForm({
  employee,
  clientId,
  open,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    event_type: "conge_paye",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const durationDays = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return null;
    try {
      const days =
        differenceInCalendarDays(
          new Date(formData.end_date),
          new Date(formData.start_date)
        ) + 1;
      return days > 0 ? days : null;
    } catch {
      return null;
    }
  }, [formData.start_date, formData.end_date]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) return;

    setSubmitting(true);
    try {
      let supporting_doc_url = null;

      if (file) {
        setUploading(true);
        supporting_doc_url = await uploadFile(file, clientId);
        setUploading(false);
      }

      const eventPayload = {
        employee_id: employee.id,
        client_id: clientId,
        event_type: formData.event_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_days: durationDays,
        reason: formData.reason,
        supporting_doc_url,
        status: "en_attente",
      };

      await onSave(eventPayload);

      // Notify n8n workflow
      try {
        await callN8n(N8N_WEBHOOKS.hrEvent, {
          event_type: formData.event_type,
          employee_id: employee.id,
          client_id: clientId,
          start_date: formData.start_date,
          end_date: formData.end_date,
          supporting_doc_url,
          employee_name: `${employee.first_name} ${employee.last_name}`,
        });
      } catch {
        // n8n notification is non-blocking
        console.warn("n8n HR event notification failed (non-blocking)");
      }

      // Reset form
      setFormData({
        event_type: "conge_paye",
        start_date: "",
        end_date: "",
        reason: "",
      });
      setFile(null);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Declarer un evenement RH</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Type d'evenement *</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) =>
                setFormData({ ...formData, event_type: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de debut *</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.start_date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value, end_date: formData.end_date && formData.end_date < e.target.value ? e.target.value : formData.end_date })
                }
                required
              />
            </div>
            <div>
              <Label>Date de fin *</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.end_date}
                min={formData.start_date || new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          {durationDays !== null && (
            <p className="text-sm text-gray-400">
              Duree : {durationDays} jour{durationDays > 1 ? "s" : ""}
            </p>
          )}

          <div>
            <Label>Motif</Label>
            <Textarea
              className="mt-1 min-h-[80px]"
              placeholder="Raison de l'evenement..."
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Justificatif *</Label>
            <div className="mt-1">
              {file ? (
                <div className="flex items-center gap-3 bg-[#1a1a2e] rounded-lg border border-gray-800 p-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
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
                <label>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-gray-800 text-gray-400 text-sm rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    Joindre un fichier
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                </label>
              )}
              {!file && formData.start_date && formData.end_date && (
                <p className="text-xs text-amber-400 mt-1.5">
                  Un justificatif est obligatoire pour valider la declaration.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={submitting || !formData.start_date || !formData.end_date || !file}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? "Upload en cours..." : "Enregistrement..."}
                </>
              ) : (
                "Declarer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
