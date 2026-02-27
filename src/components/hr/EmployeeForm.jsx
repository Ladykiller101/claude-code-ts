"use client";

import React, { useState, useEffect } from "react";
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
import { User, Mail, Phone, MapPin } from "lucide-react";

const defaultFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  position: "",
  contract_type: "CDI",
  contract_start_date: "",
  contract_end_date: "",
  working_hours: 35,
  address: "",
  status: "actif",
};

export default function EmployeeForm({ employee, open, onClose, onSave }) {
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (employee) {
      setFormData({ ...defaultFormData, ...employee });
    } else {
      setFormData(defaultFormData);
    }
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Modifier l'employe" : "Nouvel employe"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prenom *</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-10"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                className="mt-1"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Telephone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Poste</Label>
              <Input
                className="mt-1"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Type de contrat</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_type: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="alternance">Alternance</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de debut</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.contract_start_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contract_start_date: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.contract_end_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contract_end_date: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Heures/semaine</Label>
              <Input
                type="number"
                className="mt-1"
                value={formData.working_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    working_hours: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  className="pl-10 min-h-[80px]"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {employee ? "Enregistrer" : "Creer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
