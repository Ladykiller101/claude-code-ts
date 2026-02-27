"use client";

import React, { useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { useAuditLog } from "@/hooks/use-audit-log";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Loader2, Shield } from "lucide-react";

export default function DataExportButton() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const clientId = user?.company_id;

  const exportData = async () => {
    if (!clientId) return;
    setExporting(true);

    try {
      const [employees, hrEvents, tickets, documents, appointments, auditLogs] =
        await Promise.all([
          db.employees.list().then((list) =>
            list.filter((e) => e.client_id === clientId)
          ),
          db.hrEvents.list().then((list) =>
            list.filter((e) => e.client_id === clientId)
          ),
          db.tickets.list().then((list) =>
            list.filter((t) => t.client_id === clientId)
          ),
          db.documents.list().then((list) =>
            list.filter(
              (d) => d.client_id === clientId || d.created_by === user?.email
            )
          ),
          db.appointments.list().then((list) =>
            list.filter((a) => a.client_id === clientId)
          ),
          db.auditLogs.list().then((list) =>
            list.filter((a) => a.client_id === clientId)
          ),
        ]);

      const exportPayload = {
        export_date: new Date().toISOString(),
        client_id: clientId,
        user_email: user.email,
        gdpr_article: "Article 20 -- Droit a la portabilite des donnees",
        data: {
          employees,
          hr_events: hrEvents,
          tickets,
          documents: documents.map(({ file_url, ...rest }) => rest),
          appointments,
          audit_logs: auditLogs,
        },
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-donnees-${clientId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logAction("data_export", "Client", clientId, {
        reason: "GDPR Art. 20 portability request",
      });

      setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-gray-700 text-gray-300 hover:text-white gap-2"
        onClick={() => setOpen(true)}
      >
        <Shield className="w-4 h-4" />
        Exporter mes donnees
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#14141f] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Export de donnees (RGPD Art. 20)
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Conformement au RGPD, vous pouvez exporter l'ensemble de vos
              donnees personnelles dans un format structure et lisible par
              machine (JSON).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-gray-300 py-2">
            <p>L'export inclura :</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Employes et contrats</li>
              <li>Evenements RH (conges, arrets...)</li>
              <li>Tickets et echanges</li>
              <li>Documents (metadonnees uniquement)</li>
              <li>Rendez-vous</li>
              <li>Journal d'audit</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              onClick={exportData}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? "Export en cours..." : "Telecharger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
