"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Receipt,
  MoreVertical,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown
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

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.invoices.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.invoices.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.invoices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.company_name || "—";
  };

  const getDocumentUrl = (docId) => {
    const doc = documents.find((d) => d.id === docId);
    return doc?.file_url;
  };

  const getStatusBadge = (status) => {
    const styles = {
      "à_traiter": { bg: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
      "comptabilisée": { bg: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
      "payée": { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
    };
    return styles[status] || styles["à_traiter"];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      achat: "Achat",
      vente: "Vente",
      "frais_généraux": "Frais généraux",
      immobilisation: "Immobilisation",
    };
    return labels[category] || category;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(inv.client_id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || inv.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Stats
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status === "à_traiter")
    .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
  const totalTVA = invoices.reduce((sum, inv) => sum + (inv.amount_tva || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Factures - SYGMA Conseils</h1>
        <p className="text-gray-400 mt-1">Factures extraites par OCR</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total TTC</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">À traiter</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pendingAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">TVA totale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalTVA.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="à_traiter">À traiter</SelectItem>
            <SelectItem value="comptabilisée">Comptabilisée</SelectItem>
            <SelectItem value="payée">Payée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="achat">Achat</SelectItem>
            <SelectItem value="vente">Vente</SelectItem>
            <SelectItem value="frais_généraux">Frais généraux</SelectItem>
            <SelectItem value="immobilisation">Immobilisation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                <TableHead>Fournisseur</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredInvoices.map((invoice) => {
                  const statusStyle = getStatusBadge(invoice.status);
                  const StatusIcon = statusStyle.icon;
                  const docUrl = getDocumentUrl(invoice.document_id);

                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-gray-50/50"
                    >
                      <TableCell className="font-medium">
                        {invoice.vendor_name || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {getClientName(invoice.client_id)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {invoice.invoice_number || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {invoice.invoice_date
                          ? format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {invoice.amount_ttc?.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }) || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusStyle.bg} border flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {invoice.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {docUrl && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={docUrl} target="_blank" rel="noopener noreferrer">
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
                              <DropdownMenuItem
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: invoice.id,
                                    data: { ...invoice, status: "comptabilisée" },
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marquer comptabilisée
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: invoice.id,
                                    data: { ...invoice, status: "payée" },
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marquer payée
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600"
                                onClick={() => {
                                  if (confirm("Supprimer cette facture ?")) {
                                    deleteMutation.mutate(invoice.id);
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
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}

        {!isLoading && filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune facture</h3>
            <p className="text-gray-500 mt-1">
              Les factures apparaîtront ici après extraction OCR
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
