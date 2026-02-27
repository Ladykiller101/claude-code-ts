"use client";

import React, { useState } from "react";
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
import { CalendarPlus } from "lucide-react";

export default function AppointmentForm({
  open,
  onClose,
  onSave,
  clientId,
  relatedTicketId,
}) {
  const [formData, setFormData] = useState({
    appointment_type: "conseil",
    subject: "",
    description: "",
    scheduled_date: "",
    duration_minutes: "60",
    location: "Cabinet",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      client_id: clientId,
      related_ticket_id: relatedTicketId || null,
      duration_minutes: parseInt(formData.duration_minutes, 10),
    });
    setFormData({
      appointment_type: "conseil",
      subject: "",
      description: "",
      scheduled_date: "",
      duration_minutes: "60",
      location: "Cabinet",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-indigo-400" />
            Nouveau rendez-vous
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Type de rendez-vous *</Label>
            <Select
              value={formData.appointment_type}
              onValueChange={(value) =>
                setFormData({ ...formData, appointment_type: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bilan_annuel">Bilan annuel</SelectItem>
                <SelectItem value="paie">Questions paie</SelectItem>
                <SelectItem value="urgent">Question urgente</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="conseil">Conseil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Objet *</Label>
            <Input
              className="mt-1"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Objet du rendez-vous"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1 min-h-[80px]"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Details supplementaires..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date et heure *</Label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={formData.scheduled_date}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Duree</Label>
              <Select
                value={formData.duration_minutes}
                onValueChange={(value) =>
                  setFormData({ ...formData, duration_minutes: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Lieu</Label>
            <Select
              value={formData.location}
              onValueChange={(value) =>
                setFormData({ ...formData, location: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cabinet">Cabinet</SelectItem>
                <SelectItem value="Visioconference">
                  Visioconference
                </SelectItem>
                <SelectItem value="Telephone">Telephone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              Demander le rendez-vous
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
