"use client";

import { useState } from "react";
import { ShippingCompany, Department, ModalidadCobroEnvio } from "@/types/delivery";
import MapPreviewModal from "./MapPreviewModal";

interface Props {
  company: ShippingCompany;
  onClose: () => void;
  onUpdate: (updatedCompany: ShippingCompany) => void;
}

export default function BranchManagerModal({ company, onClose, onUpdate }: Props) {
  const [activeDept, setActiveDept] = useState<string | null>(company.departments[0]?.name || null);
  const [newDeptName, setNewDeptName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [previewMapUrl, setPreviewMapUrl] = useState<{ title: string; url: string } | null>(null);

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    if (company.departments.some((d) => d.name === newDeptName)) return;

    const newDept: Department = { name: newDeptName.trim(), branches: [] };
    onUpdate({
      ...company,
      departments: [...company.departments, newDept],
    });
    setNewDeptName("");
    setActiveDept(newDeptName);
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim() || !activeDept) return;

    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === activeDept) {
        return { ...dept, branches: [...dept.branches, newBranchName.trim()] };
      }
      return dept;
    });

    onUpdate({ ...company, departments: updatedDepts });
    setNewBranchName("");
  };

  const handleRemoveBranch = (deptName: string, branchName: string) => {
    const updatedDepts = company.departments.map((dept) => {
      if (dept.name === deptName) {
        return { ...dept, branches: dept.branches.filter((b) => b !== branchName) };
      }
      return dept;
    });
    onUpdate({ ...company, departments: updatedDepts });
  };

  const handleRemoveDept = (deptName: string) => {
    const updatedDepts = company.departments.filter((d) => d.name !== deptName);
    onUpdate({ ...company, departments: updatedDepts });
    if (activeDept === deptName) setActiveDept(updatedDepts[0]?.name || null);
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Gestionar Sedes y Tarifas</h2>
            <p className="text-sm text-gray-400">{company.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Departments List */}
          <div className="w-1/3 border-r border-white/10 p-6 space-y-6 overflow-y-auto bg-black/20">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-1">
                Departamentos
              </label>
              <div className="space-y-2">
                {company.departments.map((dept) => (
                  <div key={dept.name} className="group flex items-center gap-2">
                    <button
                      onClick={() => setActiveDept(dept.name)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeDept === dept.name
                          ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/30"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{dept.name}</span>
                      {dept.branches.length > 0 && (
                        <span className="ml-2 text-xs opacity-75">({dept.branches.length})</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveDept(dept.name)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-400 transition-all"
                      title="Eliminar departamento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <input
                type="text"
                placeholder="Nuevo Depto..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none mb-3"
              />
              <button
                onClick={handleAddDept}
                disabled={!newDeptName.trim()}
                className="w-full py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
              >
                + Añadir Depto
              </button>
            </div>
          </div>

          {/* Department Details and Branches */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {activeDept && currentDept ? (
              <>
                {/* Panel de Configuración de Tarifa y Ubicación Departamental */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-400">
                      Tarifa y Enlace de Mapa ({activeDept})
                    </h4>
                    {currentDept.googleMapsUrl && (
                      <button
                        onClick={() =>
                          setPreviewMapUrl({
                            title: `${company.name} - ${activeDept}`,
                            url: currentDept.googleMapsUrl!,
                          })
                        }
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver mapa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Modalidad Específica</label>
                      <select
                        value={currentDept.modalidadCobro || ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            modalidadCobro: (e.target.value as ModalidadCobroEnvio) || undefined,
                          })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value="">Heredar ({company.modalidadCobro || "PAGO_EN_DESTINO"})</option>
                        <option value="PAGO_EN_DESTINO">Pago en Destino (Bs. 0)</option>
                        <option value="TARIFA_FIJA">Tarifa Fija</option>
                        <option value="POR_COORDINAR">Por Coordinar</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Costo Específico (BOB)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder={`Heredado (${company.costoEstimadoBOB ?? 0})`}
                        value={currentDept.costoEstimadoBOB ?? ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            costoEstimadoBOB: e.target.value === "" ? undefined : parseFloat(e.target.value),
                          })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Tiempo Específico</label>
                      <input
                        type="text"
                        placeholder={`Heredado (${company.tiempoEstimadoHoras || "24-48h"})`}
                        value={currentDept.tiempoEstimadoHoras ?? ""}
                        onChange={(e) =>
                          handleUpdateDeptConfig(activeDept, {
                            tiempoEstimadoHoras: e.target.value || undefined,
                          })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">
                      Link de Google Maps (Terminal o Agencia en {activeDept})
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/... o enlace a la terminal"
                      value={currentDept.googleMapsUrl || ""}
                      onChange={(e) =>
                        handleUpdateDeptConfig(activeDept, {
                          googleMapsUrl: e.target.value.trim() || undefined,
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Sucursales / Agencias */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/10 pb-2">
                    <div>
                      <h3 className="text-base font-bold text-white">Sucursales y Agencias en {activeDept}</h3>
                      <p className="text-xs text-gray-400">{currentDept.branches.length} sedes registradas</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre de la sucursal o dirección (ej: Terminal Bimodal, Boletería 14)..."
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                    <button
                      onClick={handleAddBranch}
                      disabled={!newBranchName.trim()}
                      className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {currentDept.branches.map((branch, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all"
                      >
                        <span className="text-sm text-gray-200">{branch}</span>
                        <button
                          onClick={() => handleRemoveBranch(activeDept, branch)}
                          className="p-1.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/10"
                          title="Eliminar sucursal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {currentDept.branches.length === 0 && (
                      <div className="py-12 text-center text-gray-500 text-sm italic">
                        No hay sucursales registradas en {activeDept}.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 italic">
                <p>Selecciona un departamento para gestionar sus sucursales y tarifas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-white/10 flex justify-end bg-black/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all text-sm"
          >
            Listo
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
