"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  FileText,
  ExternalLink,
  Download,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Mail,
  Phone,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import HREventForm from "./HREventForm";
import HREventList from "./HREventList";
import { useAuditLog } from "@/hooks/use-audit-log";

const CONTRACT_COLORS = {
  CDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CDD: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  stage: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  alternance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  freelance: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS = {
  actif: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  conge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maladie: "bg-red-500/20 text-red-400 border-red-500/30",
  inactif: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_LABELS = {
  actif: "Actif",
  conge: "En conge",
  maladie: "Maladie",
  inactif: "Inactif",
};

const DOC_TYPE_COLORS = {
  contrat: "bg-blue-500/20 text-blue-400",
  bulletin_paie: "bg-emerald-500/20 text-emerald-400",
  attestation: "bg-purple-500/20 text-purple-400",
  certificat_medical: "bg-red-500/20 text-red-400",
  autre: "bg-gray-500/20 text-gray-400",
};

const DOC_TYPE_LABELS = {
  contrat: "Contrat",
  bulletin_paie: "Bulletin de paie",
  attestation: "Attestation",
  certificat_medical: "Certificat medical",
  autre: "Autre",
};

export default function EmployeeDetail({
  employee,
  clientId,
  onBack,
  onEdit,
  onDelete,
}) {
  const queryClient = useQueryClient();
  const [showEventForm, setShowEventForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("autre");
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (employee?.id) {
      logAction("view", "Employee", employee.id, {
        employee_name: `${employee.first_name} ${employee.last_name}`,
      });
    }
  }, [employee?.id]);

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["employee-documents", employee.id],
    queryFn: () => db.employeeDocuments.list(),
    select: (data) => data.filter((d) => d.employee_id === employee.id),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["hr-events", employee.id],
    queryFn: () => db.hrEvents.list(),
    select: (data) => data.filter((e) => e.employee_id === employee.id),
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => db.employeeDocuments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-documents", employee.id],
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => db.hrEvents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr-events", employee.id],
      });
      setShowEventForm(false);
    },
  });

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      try {
        const file_url = await uploadFile(file, clientId);
        await createDocMutation.mutateAsync({
          employee_id: employee.id,
          client_id: clientId,
          name: file.name,
          file_url,
          document_type: uploadDocType,
        });
      } finally {
        setUploading(false);
      }
    },
    [employee.id, clientId, uploadDocType, createDocMutation]
  );

  const handleEventSave = async (eventData) => {
    await createEventMutation.mutateAsync(eventData);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-semibold text-white flex-1">
          {employee.first_name} {employee.last_name}
        </h2>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 hover:text-red-300 border-red-800 hover:border-red-700"
            onClick={() => {
              if (
                window.confirm(
                  "Supprimer cet employe ? Cette action est irreversible."
                )
              ) {
                onDelete(employee.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>

      {/* Employee Info Card */}
      <div className="bg-[#14141f] rounded-xl border border-gray-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-gray-400">{employee.position || "Non defini"}</p>
          </div>
          <div className="flex gap-2">
            <Badge
              className={
                CONTRACT_COLORS[employee.contract_type] || CONTRACT_COLORS.CDI
              }
            >
              {employee.contract_type}
            </Badge>
            <Badge
              className={
                STATUS_COLORS[employee.status] || STATUS_COLORS.actif
              }
            >
              {STATUS_LABELS[employee.status] || employee.status}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {employee.email && (
            <div className="flex items-center gap-2 text-gray-400">
              <Mail className="w-4 h-4" />
              <span>{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-gray-400">
              <Phone className="w-4 h-4" />
              <span>{employee.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              Debut : {formatDate(employee.contract_start_date)}
            </span>
          </div>
          {employee.contract_end_date && (
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Fin : {formatDate(employee.contract_end_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{employee.working_hours || 35}h/semaine</span>
          </div>
          {employee.position && (
            <div className="flex items-center gap-2 text-gray-400">
              <Briefcase className="w-4 h-4" />
              <span>{employee.position}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Documents & Events */}
      <Tabs defaultValue="documents">
        <TabsList className="bg-[#1a1a2e]">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="events">Evenements RH</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <Select value={uploadDocType} onValueChange={setUploadDocType}>
              <SelectTrigger className="w-48 bg-[#1a1a2e] border-gray-800">
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrat">Contrat</SelectItem>
                <SelectItem value="bulletin_paie">Bulletin de paie</SelectItem>
                <SelectItem value="attestation">Attestation</SelectItem>
                <SelectItem value="certificat_medical">
                  Certificat medical
                </SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <label>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg cursor-pointer hover:bg-[#2d4a6f] transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Uploader un document
                  </>
                )}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </label>
          </div>

          {docsLoading ? (
            <div className="text-center py-8 text-gray-400">Chargement...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 bg-[#14141f] rounded-xl border border-gray-800">
              <FileText className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="mt-3 text-gray-400">Aucun document</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-[#14141f] rounded-lg border border-gray-800 p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            DOC_TYPE_COLORS[doc.document_type] ||
                            DOC_TYPE_COLORS.autre
                          }
                        >
                          {DOC_TYPE_LABELS[doc.document_type] ||
                            doc.document_type}
                        </Badge>
                        {doc.created_date && (
                          <span className="text-xs text-gray-500">
                            {formatDate(doc.created_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="text-gray-400 hover:text-white"
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="text-gray-400 hover:text-white"
                        >
                          <a href={doc.file_url} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              onClick={() => setShowEventForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Declarer un evenement
            </Button>
          </div>

          {eventsLoading ? (
            <div className="text-center py-8 text-gray-400">Chargement...</div>
          ) : (
            <HREventList events={events} />
          )}
        </TabsContent>
      </Tabs>

      <HREventForm
        employee={employee}
        clientId={clientId}
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSave={handleEventSave}
      />
    </div>
  );
}
