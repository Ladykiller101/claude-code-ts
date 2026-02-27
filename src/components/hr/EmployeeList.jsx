"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
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
import { Plus, Search, Users, Mail, CalendarPlus } from "lucide-react";
import EmployeeForm from "./EmployeeForm";
import EmployeeDetail from "./EmployeeDetail";
import HREventForm from "./HREventForm";
import HREventList from "./HREventList";

const CONTRACT_COLORS = {
  CDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CDD: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  stage: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  alternance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  freelance: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS = {
  actif: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "conge": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maladie: "bg-red-500/20 text-red-400 border-red-500/30",
  inactif: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_LABELS = {
  actif: "Actif",
  conge: "En conge",
  maladie: "Maladie",
  inactif: "Inactif",
};

export default function EmployeeList({ clientId }) {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventEmployee, setEventEmployee] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", clientId],
    queryFn: () => db.employees.list(),
    select: (data) => data.filter((e) => e.client_id === clientId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.employees.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", clientId] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.employees.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", clientId] });
      setShowForm(false);
      setEditingEmployee(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.employees.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", clientId] });
      setSelectedEmployee(null);
    },
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const handleSave = (formData) => {
    const payload = { ...formData, client_id: clientId };
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const createEventMutation = useMutation({
    mutationFn: (data) => db.hrEvents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-events"] });
      setEventEmployee(null);
    },
  });

  if (selectedEmployee) {
    return (
      <EmployeeDetail
        employee={selectedEmployee}
        clientId={clientId}
        onBack={() => setSelectedEmployee(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employes
        </h2>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => {
            setEditingEmployee(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel employe
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10 bg-[#1a1a2e] border-gray-800"
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-[#1a1a2e] border-gray-800">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="conge">En conge</SelectItem>
            <SelectItem value="maladie">Maladie</SelectItem>
            <SelectItem value="inactif">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-[#14141f] rounded-xl border border-gray-800">
          <Users className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="mt-4 text-gray-400">Aucun employe enregistre</p>
          <Button
            className="mt-4 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setEditingEmployee(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un employe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              onClick={() => setSelectedEmployee(employee)}
              className="bg-[#14141f] rounded-xl border border-gray-800 p-5 cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <p className="text-gray-400 text-sm">{employee.position}</p>
                </div>
                <Badge
                  className={
                    STATUS_COLORS[employee.status] || STATUS_COLORS.actif
                  }
                >
                  {STATUS_LABELS[employee.status] || employee.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={
                    CONTRACT_COLORS[employee.contract_type] ||
                    CONTRACT_COLORS.CDI
                  }
                >
                  {employee.contract_type}
                </Badge>
              </div>
              {employee.email && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-3">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setEventEmployee(employee);
                }}
              >
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                Declarer un evenement
              </Button>
            </div>
          ))}
        </div>
      )}

      <EmployeeForm
        employee={editingEmployee}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingEmployee(null);
        }}
        onSave={handleSave}
      />

      {eventEmployee && (
        <HREventForm
          employee={eventEmployee}
          clientId={clientId}
          open={!!eventEmployee}
          onClose={() => setEventEmployee(null)}
          onSave={(data) => createEventMutation.mutateAsync(data)}
        />
      )}
    </div>
  );
}
