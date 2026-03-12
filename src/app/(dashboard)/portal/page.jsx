"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import { uploadFile } from "@/lib/upload";
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
  Loader2
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthorization } from "@/hooks/use-authorization";
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
import { useAuditLog } from "@/hooks/use-audit-log";

export default function ClientPortal() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [chatbotContext, setChatbotContext] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFileState, setUploadFileState] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [uploading, setUploading] = useState(false);
  const { can, role } = useAuthorization();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();

  const { user: currentUser } = useAuth();
  const clientId = currentUser?.company_id;

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_date"),
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

  // Filter data — firm_admin sees everything, clients see only their data
  const isFirmUser = role === "firm_admin" || role === "accountant" || role === "payroll_manager";

  const userDocuments = isFirmUser
    ? documents
    : documents.filter((doc) => doc.created_by === currentUser?.email || doc.client_id === clientId);

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
    try {
      const file_url = await uploadFile(uploadFileState, clientId);
      await db.documents.create({
        name: uploadName || uploadFileState.name,
        client_id: clientId || "",
        category: uploadCategory,
        file_url,
        status: "en_attente",
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      logAction("upload", "Document", null, { name: uploadName || uploadFileState.name });
      setShowUpload(false);
      setUploadFileState(null);
      setUploadName("");
      setUploadCategory("autre");
    } catch (err) {
      console.error("Upload failed:", err);
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
        className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-indigo-500/20"
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
        <TabsList className="bg-[#14141f] border border-gray-800 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 gap-1.5">
            <Home className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-indigo-600 gap-1.5">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-indigo-600 gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Messages
            {openTicketCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 ml-1">
                {openTicketCount}
              </Badge>
            )}
          </TabsTrigger>
          {can("manage_employees") && (
            <TabsTrigger value="hr" className="data-[state=active]:bg-indigo-600 gap-1.5">
              <Users className="w-4 h-4" />
              RH
            </TabsTrigger>
          )}
          <TabsTrigger value="appointments" className="data-[state=active]:bg-indigo-600 gap-1.5">
            <Calendar className="w-4 h-4" />
            Rendez-vous
          </TabsTrigger>
          {can("use_chatbot") && (
            <TabsTrigger value="chatbot" className="data-[state=active]:bg-indigo-600 gap-1.5">
              <Bot className="w-4 h-4" />
              Assistant Juridique
            </TabsTrigger>
          )}
          <TabsTrigger value="signatures" className="data-[state=active]:bg-indigo-600 gap-1.5">
            <PenTool className="w-4 h-4" />
            Signatures
          </TabsTrigger>
        </TabsList>

        {/* -- Overview Tab -- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#14141f] border-gray-800">
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
                          {format(new Date(deadline.due_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline">{deadline.type}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#14141f] border-gray-800">
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
                          Échéance : {format(new Date(task.due_date), "d MMM", { locale: fr })}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">{task.priority}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-[#14141f] border-gray-800">
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
            <Card className="bg-[#14141f] border-gray-800">
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
            <Card className="bg-[#14141f] border-gray-800">
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
            <Card className="bg-[#14141f] border-gray-800">
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
            <h3 className="text-lg font-semibold text-white">Mes documents</h3>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Téléverser
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userDocuments.length === 0 ? (
              <p className="text-gray-400 col-span-full text-center py-8">
                Aucun document pour le moment
              </p>
            ) : (
              userDocuments.map((doc) => (
                <Card key={doc.id} className="bg-[#14141f] border-gray-800 hover:border-indigo-500 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <FileText className="w-10 h-10 text-indigo-400" />
                      <Badge variant="outline">{doc.category}</Badge>
                    </div>
                    <h4 className="text-white font-medium mb-2">{doc.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      {doc.created_at && format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                    <div className="flex gap-2">
                      {doc.file_url && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              logAction("view", "Document", doc.id, { name: doc.name });
                              window.open(doc.file_url, "_blank");
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" /> Voir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              logAction("download", "Document", doc.id, { name: doc.name });
                              const a = document.createElement("a");
                              a.href = doc.file_url;
                              a.download = doc.name || "";
                              a.click();
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" /> Télécharger
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* -- Messages Tab -- */}
        <TabsContent value="messages" className="space-y-6">
          <ErrorBoundary title="Erreur -- Messagerie" message="Le module de messagerie n'a pas pu se charger.">
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
                    className="bg-indigo-600 hover:bg-indigo-700"
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
            <ErrorBoundary title="Erreur -- Assistant" message="L'assistant juridique n'a pas pu se charger.">
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
          <Card className="bg-[#14141f] border-gray-800">
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
                  Aucun document a signer
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
                    <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors text-sm">
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
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={!uploadFileState || uploading}>
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
    </div>
  );
}
