"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShippingCompany, Department, ModalidadCobroEnvio } from "@/types/delivery";
import MapPreviewModal from "./MapPreviewModal";

interface Props {
  company: ShippingCompany;
  onClose: () => void;
  onUpdate: (updatedCompany: ShippingCompany) => void;
}

const BOLIVIA_DEPARTMENTS = [
  "La Paz",
  "Santa Cruz",
  "Cochabamba",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
];

export default function BranchManagerModal({ company, onClose, onUpdate }: Props) {
  const [activeDept, setActiveDept] = useState<string | null>(company.departments[0]?.name || null);
  const [newDeptName, setNewDeptName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [editingBranchIdx, setEditingBranchIdx] = useState<number | null>(null);
  const [editingBranchText, setEditingBranchText] = useState("");
  const [previewMapUrl, setPreviewMapUrl] = useState<{ title: string; url: string } | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !previewMapUrl) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, previewMapUrl]);

  // Si se eliminan departamentos y el activo ya no existe, actualizar
  useEffect(() => {
    if (activeDept && !company.departments.some((d) => d.name === activeDept)) {
      setActiveDept(company.departments[0]?.name || null);
    }
  }, [company.departments, activeDept]);

  const addDepartmentByName = (deptName: string) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;

    if (company.departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`El departamento "${trimmed}" ya está registrado`);
      return;
    }

    const newDept: Department = {
      name: trimmed,
      branches: [],
    };

    onUpdate({
      ...company,
      departments: [...company.departments, newDept],
    });
    setActiveDept(trimmed);
    setNewDeptName("");
    toast.success(`Departamento "${trimmed}" añadido`);
  };

  const handleAddCustomDept = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    addDepartmentByName(newDeptName);
  };

  const handleRemoveDept = (deptName: string) => {
    const target = company.departments.find((d) => d.name === deptName);
    const count = target?.branches.length || 0;

    const confirmMessage =
      count > 0
        ? `¿Eliminar "${deptName}" y sus ${count} sucursales? Esta acción no se puede deshacer.`
        : `¿Eliminar "${deptName}" de las sedes de envío?`;

    if (!window.confirm(confirmMessage)) return;

    const updatedDepts = company.departments.filter((d) => d.name !== deptName);
    onUpdate({ ...company, departments: updatedDepts });
    if (activeDept === deptName) {
      setActiveDept(updatedDepts[0]?.name || null);
    }
    toast.success(`Departamento "${deptName}" eliminado`);
  };

  const handleAddBranch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBranchName.trim() || !activeDept) return;

    const current = company.departments.find((d) => d.name === activeDept);
    if (!current) return;

    const branchTrimmed = newBranchName.trim();
    if (current.branches.some((b) => b.toLowerCase() === branchTrimmed.toLowerCase())) {
      toast.error("Ya existe una sucursal con ese nombre en este departamento");
      return;
    }

    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === activeDept) {
        return { ...dept, branches: [...dept.branches, branchTrimmed] };
      }
      return dept;
    });

    onUpdate({ ...company, departments: updatedDepts });
    setNewBranchName("");
    toast.success(`Sucursal agregada a ${activeDept}`);
  };

  const handleSaveEditBranch = (deptName: string, originalName: string) => {
    const trimmed = editingBranchText.trim();
    if (!trimmed) {
      toast.error("El nombre de la sucursal no puede estar vacío");
      return;
    }

    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === deptName) {
        return {
          ...dept,
          branches: dept.branches.map((b) => (b === originalName ? trimmed : b)),
        };
      }
      return dept;
    });

    onUpdate({ ...company, departments: updatedDepts });
    setEditingBranchIdx(null);
    setEditingBranchText("");
    toast.success("Sucursal actualizada");
  };

  const handleRemoveBranch = (deptName: string, branchName: string) => {
    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === deptName) {
        return { ...dept, branches: dept.branches.filter((b) => b !== branchName) };
      }
      return dept;
    });
    onUpdate({ ...company, departments: updatedDepts });
    toast.success("Sucursal eliminada");
  };

  const handleUpdateDeptConfig = (
    deptName: string,
    updates: Partial<Pick<Department, "modalidadCobro" | "costoEstimadoBOB" | "tiempoEstimadoHoras" | "googleMapsUrl">>
  ) => {
    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === deptName) {
        return { ...dept, ...updates };
      }
      return dept;
    });
    onUpdate({ ...company, departments: updatedDepts });
  };

  const currentDept = company.departments.find((d) => d.name === activeDept);

  // Departamentos bolivianos faltantes para el quick-add
  const registeredNamesLower = new Set(company.departments.map((d) => d.name.toLowerCase()));
  const missingBoliviaDepts = BOLIVIA_DEPARTMENTS.filter(
    (dept) => !registeredNamesLower.has(dept.toLowerCase())
  );

  // Filtrado de sucursales activas
  const filteredBranches = (currentDept?.branches || []).filter((branch) =>
    branch.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const effectiveModalidad = currentDept?.modalidadCobro || company.modalidadCobro || "PAGO_EN_DESTINO";
  const isDestino = effectiveModalidad === "PAGO_EN_DESTINO";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header con identidad de la empresa */}
        <header className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-lg shadow-inner">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Gestionar Sedes y Tarifas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {company.departments.length} {company.departments.length === 1 ? "depto" : "deptos"}
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-gray-200">{company.name}</span>
                <span className="text-gray-600">•</span>
                <span className="font-mono text-[11px] text-gray-500">{company.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Cuerpo del Modal (2 columnas responsive) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Departamentos */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 p-4 sm:p-5 flex flex-col bg-black/30 overflow-y-auto max-h-[35vh] md:max-h-none">
            
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Departamentos ({company.departments.length})
              </label>
            </div>

            {/* Lista de Departamentos Registrados */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              {company.departments.map((dept) => {
                const isSelected = activeDept === dept.name;
                const hasCustomTariff = Boolean(dept.modalidadCobro || dept.costoEstimadoBOB !== undefined);

                return (
                  <div
                    key={dept.name}
                    className={`group relative flex items-center justify-between rounded-xl border transition-all ${
                      isSelected
                        ? "bg-cyan-600/20 border-cyan-500/60 shadow-lg shadow-cyan-950/40 text-white"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/20 text-gray-300"
                    }`}
                  >
                    <button
                      onClick={() => setActiveDept(dept.name)}
                      className="flex-1 text-left px-3.5 py-2.5 flex items-center justify-between min-w-0"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isSelected ? "bg-cyan-400" : "bg-gray-500"
                          }`}
                        />
                        <span className="text-sm font-semibold truncate">{dept.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {hasCustomTariff && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            title="Tiene tarifa personalizada para este depto"
                          >
                            Tarifa propia
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            isSelected
                              ? "bg-cyan-500/30 text-cyan-200"
                              : "bg-white/5 text-gray-400"
                          }`}
                        >
                          {dept.branches.length} {dept.branches.length === 1 ? "sede" : "sedes"}
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleRemoveDept(dept.name)}
                      className="p-2 text-gray-500 hover:text-red-400 rounded-lg mr-1.5 opacity-60 hover:opacity-100 hover:bg-red-500/10 transition-all"
                      title={`Eliminar ${dept.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              {company.departments.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-500 italic bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                  Sin departamentos aún.
                  <br />
                  Haz clic abajo para agregar uno.
                </div>
              )}
            </div>

            {/* Quick-Add Chips de Bolivia */}
            {missingBoliviaDepts.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Añadir rápido (Bolivia):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {missingBoliviaDepts.map((name) => (
                    <button
                      key={name}
                      onClick={() => addDepartmentByName(name)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input para agregar departamento personalizado */}
            <form onSubmit={handleAddCustomDept} className="pt-3 mt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Otro depto / ciudad..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newDeptName.trim()}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
              >
                + Añadir
              </button>
            </form>
          </div>

          {/* Columna Derecha: Detalles del Departamento Seleccionado */}
          <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-900/60">
            {activeDept && currentDept ? (
              <>
                {/* Cabecera del departamento seleccionado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📍</span>
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {currentDept.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {currentDept.branches.length} {currentDept.branches.length === 1 ? "agencia" : "agencias"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Personaliza tarifa, tiempo estimado y sucursales físicas para este destino.
                    </p>
                  </div>

                  {currentDept.googleMapsUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPreviewMapUrl({
                            title: `${company.name} - ${activeDept}`,
                            url: currentDept.googleMapsUrl!,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Previsualizar mapa
                      </button>
                    </div>
                  )}
                </div>

                {/* Card 1: Tarifa, Tiempo y Mapa del Departamento */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                        💰
                      </div>
                      <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-300">
                        Tarifa y Ubicación Departamental
                      </h4>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      General: <strong className="text-gray-300">{company.modalidadCobro || "PAGO_EN_DESTINO"}</strong>
                      {company.modalidadCobro === "TARIFA_FIJA" && ` (Bs. ${company.costoEstimadoBOB ?? 0})`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Modalidad */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                        Modalidad de Cobro
                      </label>
                      <select
                        value={currentDept.modalidadCobro || ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            modalidadCobro: (e.target.value as ModalidadCobroEnvio) || undefined,
                          })
                        }
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                      >
                        <option value="">Heredar general ({company.modalidadCobro || "PAGO_EN_DESTINO"})</option>
                        <option value="PAGO_EN_DESTINO">Pago en Destino (Costo 0)</option>
                        <option value="TARIFA_FIJA">Tarifa Fija (Prepagada)</option>
                        <option value="POR_COORDINAR">Por Coordinar</option>
                      </select>
                    </div>

                    {/* Costo Estimado BOB */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                        Costo Flete (BOB)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          disabled={isDestino}
                          placeholder={
                            isDestino
                              ? "0.00 (Pago en destino)"
                              : `Heredado (${company.costoEstimadoBOB ?? 0})`
                          }
                          value={isDestino ? 0 : (currentDept.costoEstimadoBOB ?? "")}
                          onChange={(e) =>
                            handleUpdateDeptConfig(activeDept, {
                              costoEstimadoBOB:
                                e.target.value === "" ? undefined : parseFloat(e.target.value),
                            })
                          }
                          className="w-full bg-black/50 border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors font-mono"
                        />
                        <span className="absolute left-2.5 top-2 text-gray-500 text-xs font-bold">Bs</span>
                      </div>
                    </div>

                    {/* Tiempo Estimado */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-300 mb-1 block">
                        Tiempo Estimado
                      </label>
                      <input
                        type="text"
                        placeholder={`Heredado (${company.tiempoEstimadoHoras || "24-48 hrs"})`}
                        value={currentDept.tiempoEstimadoHoras ?? ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            tiempoEstimadoHoras: e.target.value || undefined,
                          })
                        }
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Google Maps Link */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 mb-1 block flex items-center justify-between">
                      <span>Enlace de Google Maps (Terminal o Agencia Central en {activeDept})</span>
                      {currentDept.googleMapsUrl && (
                        <a
                          href={currentDept.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 font-normal underline"
                        >
                          Abrir en pestaña nueva ↗
                        </a>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://maps.app.goo.gl/... o dirección en mapa"
                        value={currentDept.googleMapsUrl || ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            googleMapsUrl: e.target.value.trim() || undefined,
                          })
                        }
                        className="w-full bg-black/50 border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                      />
                      <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🗺</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Sucursales y Agencias Físicas */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>🏢</span>
                        <span>Sucursales y Agencias en {activeDept}</span>
                      </h4>
                      <p className="text-xs text-gray-400">
                        Puntos específicos donde el cliente puede recoger su encomienda.
                      </p>
                    </div>

                    {currentDept.branches.length > 4 && (
                      <div className="relative w-full sm:w-56">
                        <input
                          type="text"
                          placeholder="Buscar sucursal..."
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                        {branchSearch && (
                          <button
                            onClick={() => setBranchSearch("")}
                            className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-white"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Formulario para agregar sucursal */}
                  <form onSubmit={handleAddBranch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Terminal Bimodal, Boletería 14 / Av. San Martín #450..."
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newBranchName.trim()}
                      className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40 shrink-0"
                    >
                      + Añadir Sucursal
                    </button>
                  </form>

                  {/* Lista de Sucursales */}
                  <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                    {filteredBranches.map((branch, idx) => {
                      const isEditing = editingBranchIdx === idx;

                      return (
                        <div
                          key={idx}
                          className="group flex items-center justify-between p-3 bg-white/[0.04] border border-white/10 rounded-2xl hover:border-cyan-500/40 hover:bg-white/[0.07] transition-all"
                        >
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2 mr-2">
                              <input
                                type="text"
                                value={editingBranchText}
                                onChange={(e) => setEditingBranchText(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditBranch(activeDept, branch);
                                  if (e.key === "Escape") setEditingBranchIdx(null);
                                }}
                                className="flex-1 bg-black/60 border border-cyan-500 rounded-xl px-3 py-1 text-xs text-white outline-none"
                              />
                              <button
                                onClick={() => handleSaveEditBranch(activeDept, branch)}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingBranchIdx(null)}
                                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded-lg transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-gray-200 truncate">
                                  {branch}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingBranchIdx(idx);
                                    setEditingBranchText(branch);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-cyan-300 rounded-lg hover:bg-white/10 transition-all"
                                  title="Editar nombre"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleRemoveBranch(activeDept, branch)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                                  title="Eliminar sucursal"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {filteredBranches.length === 0 && currentDept.branches.length > 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs italic">
                        No hay sucursales que coincidan con la búsqueda.
                      </div>
                    )}

                    {currentDept.branches.length === 0 && (
                      <div className="py-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-white/[0.02]">
                        <span className="text-2xl mb-2">🏬</span>
                        <p className="text-xs sm:text-sm font-semibold text-gray-300">
                          Sin sucursales registradas en {activeDept}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-sm">
                          Escribe el nombre de la terminal, agencia o dirección arriba y presiona &ldquo;+ Añadir Sucursal&rdquo;.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 italic">
                <span className="text-3xl mb-3">📍</span>
                <p className="text-sm font-medium text-gray-400">
                  Selecciona un departamento de la lista o agrega uno nuevo.
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Podrás configurar la tarifa de flete, tiempos de entrega y direcciones de sus agencias físicas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-3.5 sm:p-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <div className="text-xs text-gray-400 hidden sm:block">
            {company.departments.length} departamentos •{" "}
            {company.departments.reduce((acc, d) => acc + d.branches.length, 0)} sedes totales
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-lg shadow-cyan-950/40"
          >
            Listo / Guardar Cambios
          </button>
        </footer>
      </div>

      {previewMapUrl && (
        <MapPreviewModal
          title={previewMapUrl.title}
          subtitle="Terminal / Agencia de Encomiendas"
          url={previewMapUrl.url}
          onClose={() => setPreviewMapUrl(null)}
        />
      )}
    </div>
  );
}
