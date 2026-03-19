"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  Eye,
  PenTool,
  Users,
  Calendar,
  Bot,
  Home,
  Headset,
  X,
  Loader2,
  HardDrive,
  RefreshCw,
  CloudOff,
  Unplug,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthorization } from "@/hooks/use-authorization";

const safeFmt = (d, fmt) => { if (!d) return "—"; const p = new Date(d); return isNaN(p.getTime()) ? "—" : format(p, fmt, { locale: fr }); };
import { useAuth } from "@/lib/auth-context";

// Module components
import TicketList from "@/components/tickets/TicketList";
import TicketDetail from "@/components/tickets/TicketDetail";
import TicketForm from "@/components/tickets/TicketForm";
import ContactAccountantButton from "@/components/tickets/ContactAccountantButton";
import EmployeeList from "@/components/hr/EmployeeList";
import AppointmentList from "@/components/appointments/AppointmentList";
import LegalChatbot from "@/components/chatbot/LegalChatbot";
import DataExportButton from "@/components/gdpr/DataExportButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import MessageThread from "@/components/messages/MessageThread";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useUnreadCount } from "@/hooks/use-messages";
import { useDriveDocuments } from "@/hooks/use-drive-documents";
import DocumentViewer from "@/components/documents/DocumentViewer";
import OCRScanner from "@/components/documents/OCRScanner";

export default function ClientPortal() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [chatbotContext, setChatbotContext] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFileState, setUploadFileState] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const { can, role } = useAuthorization();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();

  const { user: currentUser } = useAuth();
  const clientId = currentUser?.company_id;
  const unreadMsgCount = useUnreadCount(clientId, currentUser?.id);

  // Filter data — firm_admin sees everything, clients see only their data
  const isFirmUserEarly = role === "firm_admin" || role === "accountant" || role === "payroll_manager";

  const {
    documents: mergedDocuments,
    isDriveLoading,
    isDriveConfigured,
    driveReason,
  } = useDriveDocuments(clientId, currentUser?.email, isFirmUserEarly);

  const [syncingDrive, setSyncingDrive] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [viewerDocId, setViewerDocId] = useState(null);
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false);

  const handleDriveDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google/drive/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, removeSyncedDocs: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Disconnect failed");
      }
      setShowDisconnect(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["drive-files", clientId] });
    } catch (err) {
      console.error("Drive disconnect failed:", err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDriveSync = async () => {
    setSyncingDrive(true);
    try {
      await fetch("/api/google/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, admin: true }),
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["drive-files", clientId] });
    } catch (err) {
      console.error("Drive sync failed:", err);
    } finally {
      setSyncingDrive(false);
    }
  };

  const { data: portalClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => db.tasks.list("-due_date"),
  });

  const { data: deadlines = [] } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => db.deadlines.list("-due_date"),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", clientId],
    queryFn: () => db.tickets.list("-created_at"),
    enabled: !!clientId,
  });

  const isFirmUser = isFirmUserEarly;
  const userDocuments = mergedDocuments;

  const upcomingDeadlines = deadlines
    .filter((d) => d.status !== "terminée" && d.status !== "terminee")
    .filter((d) => isFirmUser || !d.client_id || d.client_id === clientId)
    .slice(0, 5);

  const userTasks = isFirmUser
    ? tasks.filter((t) => t.status !== "terminée" && t.status !== "terminee")
    : tasks.filter(
        (t) => (t.assigned_to === currentUser?.email || t.client_id === clientId) && t.status !== "terminée" && t.status !== "terminee"
      );

  const clientTickets = isFirmUser
    ? tickets
    : tickets.filter((t) => t.client_id === clientId);
  const openTicketCount = clientTickets.filter(
    (t) => !["resolu", "ferme"].includes(t.status)
  ).length;

  const handleEscalateFromChatbot = (context) => {
    setChatbotContext(context);
    setShowTicketForm(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFileState) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFileState);
      formData.append("name", uploadName || uploadFileState.name);
      formData.append("category", uploadCategory);
      if (clientId) formData.append("client_id", clientId);

      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      logAction("upload", "Document", null, { name: uploadName || uploadFileState.name });
      setUploadError("");
      setShowUpload(false);
      setUploadFileState(null);
      setUploadName("");
      setUploadCategory("autre");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.message || "Erreur lors de l'upload, veuillez reessayer");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Portail Client - SYGMA Conseils
          </h1>
          <p className="text-gray-400 mt-1">
            Votre espace personnel sécurisé pour tous vos échanges
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataExportButton />
          <ContactAccountantButton
            clientId={clientId}
            currentUser={currentUser}
            chatbotContext={null}
          />
        </div>
      </div>

      {/* Missing Client ID Warning */}
      {!clientId && currentUser && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-200 font-medium text-sm">Configuration requise</p>
            <p className="text-amber-300/70 text-sm mt-1">
              Votre compte n'est pas encore rattaché à une entreprise. Contactez votre administrateur
              pour configurer votre profil (company_id dans les métadonnées utilisateur).
            </p>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 lg:p-8 shadow-xl shadow-purple-500/20"
        style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3, #a855f7)" }}
      >
        <h2 className="text-xl font-semibold text-white">
          Bienvenue, {currentUser?.full_name || "Client"}
        </h2>
        <p className="text-indigo-100 mt-2">
          Accédez à tous vos documents, échangez avec votre conseiller et suivez
          vos échéances en un seul endroit.
        </p>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#13131a] border border-[#1e1e2e] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 gap-1.5">
            <Home className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-purple-600 gap-1.5">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="messagerie" className="data-[state=active]:bg-purple-600 gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Messagerie
            {unreadMsgCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 ml-1">
                {unreadMsgCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-purple-600 gap-1.5">
            <Headset className="w-4 h-4" />
            Tickets
            {openTicketCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 ml-1">
                {openTicketCount}
              </Badge>
            )}
          </TabsTrigger>
          {can("manage_employees") && (
            <TabsTrigger value="hr" className="data-[state=active]:bg-purple-600 gap-1.5">
              <Users className="w-4 h-4" />
              RH
            </TabsTrigger>
          )}
          <TabsTrigger value="appointments" className="data-[state=active]:bg-purple-600 gap-1.5">
            <Calendar className="w-4 h-4" />
            Rendez-vous
          </TabsTrigger>
          {can("use_chatbot") && (
            <TabsTrigger value="chatbot" className="data-[state=active]:bg-purple-600 gap-1.5">
              <Bot className="w-4 h-4" />
              Assistant IA 24/7
            </TabsTrigger>
          )}
          <TabsTrigger value="signatures" className="data-[state=active]:bg-purple-600 gap-1.5">
            <PenTool className="w-4 h-4" />
            Signatures
          </TabsTrigger>
        </TabsList>

        {/* -- Overview Tab -- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Prochaines échéances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune échéance à venir</p>
                ) : (
                  upcomingDeadlines.map((deadline) => (
                    <div key={deadline.id} className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded-lg">
                      <div>
                        <p className="text-white font-medium">{deadline.title}</p>
                        <p className="text-gray-400 text-sm">
                          {safeFmt(deadline.due_date, "d MMMM yyyy")}
                        </p>
                      </div>
                      <span className="border border-[#2a2a3e] text-[#6a6a8a] text-xs px-2 py-0.5 rounded">
                        {deadline.type || deadline.category}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Mes tâches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userTasks.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune tâche assignée</p>
                ) : (
                  userTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-[#1a1a2e] rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-gray-400 text-sm">
                          Échéance : {safeFmt(task.due_date, "d MMM")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        task.status === "terminée" || task.status === "terminee" || task.status === "DONE"
                          ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800"
                          : task.status === "en_cours" || task.status === "IN_PROGRESS"
                          ? "bg-amber-900/40 text-amber-400 border border-amber-800"
                          : "bg-gray-800/40 text-gray-400 border border-gray-700"
                      }`}>
                        {task.status === "en_cours" || task.status === "IN_PROGRESS" ? "En cours"
                          : task.status === "terminée" || task.status === "terminee" || task.status === "DONE" ? "Terminé"
                          : "À faire"}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Documents</p>
                    <p className="text-2xl font-bold text-white mt-1">{userDocuments.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Échéances</p>
                    <p className="text-2xl font-bold text-white mt-1">{upcomingDeadlines.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tâches actives</p>
                    <p className="text-2xl font-bold text-white mt-1">{userTasks.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#13131a] border-[#1e1e2e]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets ouverts</p>
                    <p className="text-2xl font-bold text-white mt-1">{openTicketCount}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -- Documents Tab -- */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Mes documents</h3>
              {isDriveConfigured && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded">
                  <HardDrive className="w-3 h-3" /> Google Drive connecté
                </span>
              )}
              {isDriveLoading && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {isDriveConfigured && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-400 border-[#2a2a3e] hover:text-white"
                    onClick={handleDriveSync}
                    disabled={syncingDrive}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${syncingDrive ? "animate-spin" : ""}`} />
                    Synchroniser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-900/50 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => setShowDisconnect(true)}
                  >
                    <Unplug className="w-4 h-4 mr-1" />
                    Déconnecter
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="border-indigo-600/50 text-indigo-400 hover:bg-indigo-900/30 hover:text-indigo-300"
                onClick={() => setOcrScannerOpen(true)}
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scanner OCR
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Téléverser
              </Button>
            </div>
          </div>

          {/* Drive not configured banner */}
          {!isDriveConfigured && driveReason && driveReason !== "google_not_connected" && (
            <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3 flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-300/80 text-sm">
                Google Drive non configuré pour ce dossier client. Contactez votre administrateur pour lier un dossier Drive.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userDocuments.length === 0 ? (
              <p className="text-gray-400 col-span-full text-center py-8">
                Aucun document disponible
              </p>
            ) : (
              userDocuments.map((doc) => (
                <Card key={doc.id} className="bg-[#13131a] border-[#1e1e2e] hover:border-purple-500 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {doc.source === "google_drive" ? (
                        <HardDrive className="w-10 h-10 text-blue-400" />
                      ) : (
                        <FileText className="w-10 h-10 text-indigo-400" />
                      )}
                      <div className="flex items-center gap-1.5">
                        {doc.source === "google_drive" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800">
                            Drive
                          </span>
                        )}
                        <span className="border border-[#2a2a3e] text-[#6a6a8a] text-xs px-2 py-0.5 rounded">
                          {doc.category}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-white font-medium mb-2 truncate" title={doc.name}>{doc.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      {safeFmt(doc.drive_modified_time || doc.created_at, "d MMM yyyy")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                          logAction("view", "Document", doc.id, { name: doc.name });
                          setViewerDocId(doc.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Voir
                      </Button>
                      {doc.source !== "google_drive" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => {
                            logAction("download", "Document", doc.id, { name: doc.name });
                            window.open(`/api/documents/${doc.id}/download?download=true`, "_blank");
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" /> Télécharger
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* -- Direct Messaging Tab -- */}
        <TabsContent value="messagerie" className="space-y-6">
          <ErrorBoundary title="Erreur -- Messagerie" message="Le module de messagerie n'a pas pu se charger.">
            <MessageThread
              clientId={clientId}
              currentUser={currentUser}
            />
          </ErrorBoundary>
        </TabsContent>

        {/* -- Tickets Tab -- */}
        <TabsContent value="messages" className="space-y-6">
          <ErrorBoundary title="Erreur -- Tickets" message="Le module de tickets n'a pas pu se charger.">
            {selectedTicket ? (
              <TicketDetail
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                currentUser={currentUser}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Mes tickets</h3>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => setShowTicketForm(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Nouveau ticket
                  </Button>
                </div>
                <TicketList
                  clientId={clientId}
                  onSelectTicket={setSelectedTicket}
                />
              </div>
            )}
          </ErrorBoundary>
        </TabsContent>

        {/* -- HR Tab -- */}
        {can("manage_employees") && (
          <TabsContent value="hr" className="space-y-6">
            <ErrorBoundary title="Erreur -- RH" message="Le module RH n'a pas pu se charger.">
              <EmployeeList clientId={clientId} />
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* -- Appointments Tab -- */}
        <TabsContent value="appointments" className="space-y-6">
          <ErrorBoundary title="Erreur -- Rendez-vous" message="Le module de rendez-vous n'a pas pu se charger.">
            <AppointmentList clientId={clientId} currentUser={currentUser} />
          </ErrorBoundary>
        </TabsContent>

        {/* -- Chatbot Tab -- */}
        {can("use_chatbot") && (
          <TabsContent value="chatbot" className="space-y-6">
            <ErrorBoundary title="Erreur -- Assistant" message="L'assistant IA n'a pas pu se charger.">
              <LegalChatbot
                clientId={clientId}
                currentUser={currentUser}
                onEscalateToTicket={handleEscalateFromChatbot}
              />
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* -- Signatures Tab -- */}
        <TabsContent value="signatures" className="space-y-6">
          <Card className="bg-[#13131a] border-[#1e1e2e]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-purple-400" />
                Signature électronique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PenTool className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Aucune signature en attente
                </h3>
                <p className="text-gray-400">
                  Les documents nécessitant votre signature apparaîtront ici
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Form Dialog */}
      <TicketForm
        open={showTicketForm}
        onClose={() => {
          setShowTicketForm(false);
          setChatbotContext(null);
        }}
        onSave={async (ticketData) => {
          const created = await db.tickets.create({
            ...ticketData,
            created_by: currentUser?.email || "",
          });
          try {
            await callN8n(N8N_WEBHOOKS.ticketCreate, {
              ticket_id: created.id,
              client_id: clientId,
              title: ticketData.title,
              description: ticketData.description,
              priority: ticketData.priority,
              category: ticketData.category,
              client_email: currentUser?.email,
              client_name: currentUser?.full_name,
            });
          } catch (e) {
            console.warn("n8n ticket notification failed:", e);
          }
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          setShowTicketForm(false);
          setChatbotContext(null);
        }}
        clientId={clientId}
        prefillData={
          chatbotContext
            ? { priority: "urgente", source: "chatbot", chatbot_context: chatbotContext }
            : null
        }
      />

      {/* Document Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Téléverser un document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
            {uploadError && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
                {uploadError}
              </div>
            )}
            <div
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) { setUploadFileState(f); if (!uploadName) setUploadName(f.name); }
              }}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                uploadFileState ? "border-emerald-500/50 bg-emerald-900/20" : "border-gray-700 hover:border-indigo-500"
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
                  "Téléverser"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drive Disconnect Confirmation */}
      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent className="bg-[#13131a] border-[#1e1e2e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Déconnecter Google Drive ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Cette action supprimera la liaison Google Drive.
              Les documents synchronisés depuis Drive seront retirés de la plateforme.
              Les fichiers sur Google Drive ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-[#2a2a3e] text-gray-300 hover:text-white"
              disabled={disconnecting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDriveDisconnect();
              }}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Déconnexion...</>
              ) : (
                <><Unplug className="w-4 h-4 mr-2" />Déconnecter</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentViewer
        documentId={viewerDocId}
        open={!!viewerDocId}
        onClose={() => setViewerDocId(null)}
      />

      <OCRScanner
        clients={portalClients}
        open={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] });
          setOcrScannerOpen(false);
        }}
      />
    </div>
  );
}
