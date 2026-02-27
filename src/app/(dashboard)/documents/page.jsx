"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Download,
  Sparkles,
  MoreVertical,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DocumentUpload from "@/components/documents/DocumentUpload";
import OCRProcessor from "@/components/documents/OCRProcessor";

export default function Documents() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ocrDocument, setOcrDocument] = useState(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.documents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setUploadOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.documents.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => db.invoices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.company_name || "—";
  };

  const getCategoryLabel = (category) => {
    const labels = {
      facture: "Facture",
      devis: "Devis",
      contrat: "Contrat",
      bulletin_paie: "Bulletin de paie",
      declaration_fiscale: "Déclaration fiscale",
      releve_bancaire: "Relevé bancaire",
      autre: "Autre",
    };
    return labels[category] || category;
  };

  const getStatusIcon = (status) => {
    const icons = {
      en_attente: <Clock className="w-4 h-4 text-amber-500" />,
      traité: <CheckCircle className="w-4 h-4 text-blue-500" />,
      validé: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      rejeté: <XCircle className="w-4 h-4 text-rose-500" />,
    };
    return icons[status] || icons.en_attente;
  };

  const handleOCRComplete = async (updatedDoc) => {
    await updateMutation.mutateAsync({ id: updatedDoc.id, data: updatedDoc });

    // Create invoice from extracted data
    if (updatedDoc.extracted_data && updatedDoc.category === "facture") {
      await createInvoiceMutation.mutateAsync({
        document_id: updatedDoc.id,
        client_id: updatedDoc.client_id,
        ...updatedDoc.extracted_data,
        status: "à_traiter",
        category: "achat",
      });
    }

    setOcrDocument(null);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(doc.client_id).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Documents - SYGMA Conseils</h1>
          <p className="text-gray-400 mt-1">Centralisez et gérez vos documents</p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Uploader
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="facture">Facture</SelectItem>
            <SelectItem value="devis">Devis</SelectItem>
            <SelectItem value="contrat">Contrat</SelectItem>
            <SelectItem value="bulletin_paie">Bulletin de paie</SelectItem>
            <SelectItem value="releve_bancaire">Relevé bancaire</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="traité">Traité</SelectItem>
            <SelectItem value="validé">Validé</SelectItem>
            <SelectItem value="rejeté">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead>Document</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-gray-50/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getClientName(doc.client_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        <span className="text-gray-600 capitalize">
                          {doc.status?.replace("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(doc.created_date), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.category === "facture" && doc.status === "en_attente" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOcrDocument(doc)}
                            className="text-[#4f46e5] hover:text-[#4f46e5] hover:bg-indigo-50"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            OCR
                          </Button>
                        )}
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.file_url && (
                              <DropdownMenuItem asChild>
                                <a href={doc.file_url} download>
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-rose-600"
                              onClick={() => {
                                if (confirm("Supprimer ce document ?")) {
                                  deleteMutation.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}

        {!isLoading && filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun document</h3>
            <p className="text-gray-500 mt-1">Uploadez votre premier document</p>
          </div>
        )}
      </div>

      <DocumentUpload
        clients={clients}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
      />

      {ocrDocument && (
        <OCRProcessor
          document={ocrDocument}
          open={!!ocrDocument}
          onClose={() => setOcrDocument(null)}
          onSave={handleOCRComplete}
        />
      )}
    </div>
  );
}
