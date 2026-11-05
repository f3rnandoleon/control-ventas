"use client";

import { useState } from "react";
import { ShippingCompany, ModalidadCobroEnvio } from "@/types/delivery";
import { slugify } from "@/utils/slugify";
import BranchManagerModal from "./BranchManagerModal";
import MapPreviewModal from "./MapPreviewModal";

interface Props {
  companies: ShippingCompany[];
  onChange: (companies: ShippingCompany[]) => void;
}

export default function ShippingCompaniesManager({ companies, onChange }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModalidad, setNewModalidad] = useState<ModalidadCobroEnvio>("PAGO_EN_DESTINO");
  const [newCosto, setNewCosto] = useState<number>(0);
  const [newTiempo, setNewTiempo] = useState("24 a 48 horas hábiles");
  const [newMapsUrl, setNewMapsUrl] = useState("");

  const [selectedCompany, setSelectedCompany] = useState<ShippingCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [previewMap, setPreviewMap] = useState<{ title: string; subtitle?: string; url: string } | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newCompany: ShippingCompany = {
      id: slugify(newName),
      name: newName.trim(),
      modalidadCobro: newModalidad,
      costoEstimadoBOB: newModalidad === "PAGO_EN_DESTINO" ? 0 : Number(newCosto) || 0,
      tiempoEstimadoHoras: newTiempo.trim() || "24 a 48 horas hábiles",
      googleMapsUrl: newMapsUrl.trim() || undefined,
      departments: [],
    };
    onChange([...companies, newCompany]);
    setNewName("");
    setNewModalidad("PAGO_EN_DESTINO");
    setNewCosto(0);
    setNewTiempo("24 a 48 horas hábiles");
    setNewMapsUrl("");
    setShowAddForm(false);
  };

  const handleRemove = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta empresa? Se borrarán todas sus sucursales y tarifas.")) {
      onChange(companies.filter((c) => c.id !== id));
    }
  };

  const handleUpdate = (updatedCompany: ShippingCompany) => {
    const updatedList = companies.map((c) => (c.id === updatedCompany.id ? updatedCompany : c));
    onChange(updatedList);
    if (selectedCompany?.id === updatedCompany.id) setSelectedCompany(updatedCompany);
    if (editingCompany?.id === updatedCompany.id) setEditingCompany(null);
  };

  const saveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    handleUpdate(editingCompany);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Empresas de Envío Nacional y Tarifas</h2>
          <p className="text-sm text-gray-400">
            Configura empresas, tarifas estimadas de flete, tiempos de entrega y mapas de agencias.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 shrink-0"
        >
          {showAddForm ? "Cancelar" : "+ Nueva Empresa"}
        </button>
      </div>

      {/* Formulario desplegable para agregar empresa */}
      {showAddForm && (
        <div className="bg-white/5 border border-cyan-500/30 rounded-3xl p-6 space-y-4 animate-in fade-in duration-300">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Registrar Transportadora
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Nombre de la Empresa</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Bolivar Cargo, Trans Copacabana"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Modalidad de Cobro</label>
              <select
                value={newModalidad}
                onChange={(e) => setNewModalidad(e.target.value as ModalidadCobroEnvio)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              >
                <option value="PAGO_EN_DESTINO">Pago en Destino (Costo 0 en web)</option>
                <option value="TARIFA_FIJA">Tarifa Fija (Prepagada)</option>
                <option value="POR_COORDINAR">Por Coordinar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                Costo Estimado (BOB) {newModalidad === "PAGO_EN_DESTINO" && "(Automático: 0)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                disabled={newModalidad === "PAGO_EN_DESTINO"}
                value={newModalidad === "PAGO_EN_DESTINO" ? 0 : newCosto}
                onChange={(e) => setNewCosto(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Tiempo Estimado de Entrega</label>
              <input
                type="text"
                value={newTiempo}
                onChange={(e) => setNewTiempo(e.target.value)}
                placeholder="Ej: 24 a 48 horas hábiles"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Link de Google Maps (Opcional)</label>
              <input
                type="url"
                value={newMapsUrl}
                onChange={(e) => setNewMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/... o enlace al mapa de la transportadora"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 text-gray-400 hover:text-white text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Guardar Transportadora
            </button>
          </div>
        </div>
      )}

      {/* Grid de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {companies.map((company) => {
          const modalidad = company.modalidadCobro || "PAGO_EN_DESTINO";
          const costo = typeof company.costoEstimadoBOB === "number" ? company.costoEstimadoBOB : (modalidad === "TARIFA_FIJA" ? 25 : 0);
          const tiempo = company.tiempoEstimadoHoras || "24 a 48 horas hábiles";

          return (
            <div
              key={company.id}
              className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              {/* Botón eliminar */}
              <div className="absolute top-4 right-4 flex gap-1.5">
                <button
                  onClick={() => setEditingCompany(company)}
                  title="Editar tarifas y enlace"
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-all bg-black/30 rounded-xl hover:bg-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemove(company.id)}
                  title="Eliminar empresa"
                  className="p-2 text-gray-400 hover:text-red-400 transition-all bg-black/30 rounded-xl hover:bg-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-0.5">{company.name}</h3>
                <p className="text-[10px] text-gray-500 font-mono italic mb-3">{company.id}</p>

                {/* Insignias de tarifa y tiempo */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {modalidad === "PAGO_EN_DESTINO" && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Pago en destino (Bs. 0)
                    </span>
                  )}
                  {modalidad === "TARIFA_FIJA" && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Tarifa fija: Bs. {costo.toFixed(2)}
                    </span>
                  )}
                  {modalidad === "POR_COORDINAR" && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Por coordinar
                    </span>
                  )}

                  <span className="px-2.5 py-1 rounded-lg text-[11px] text-gray-300 bg-white/5 border border-white/10">
                    ⏱ {tiempo}
                  </span>

                  {company.googleMapsUrl && (
                    <button
                      onClick={() =>
                        setPreviewMap({
                          title: company.name,
                          subtitle: "Oficina / Terminal de Encomiendas",
                          url: company.googleMapsUrl!,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ver mapa
                    </button>
                  )}
                </div>

                {/* Departamentos */}
                <div className="flex gap-1.5 flex-wrap min-h-[1.5rem]">
                  {company.departments.map((d) => (
                    <span
                      key={d.name}
                      className="px-2 py-0.5 bg-white/5 text-gray-300 text-[10px] font-medium rounded-md border border-white/10"
                    >
                      {d.name} ({d.branches.length})
                    </span>
                  ))}
                  {company.departments.length === 0 && (
                    <span className="text-gray-600 text-xs italic">Sin sedes configuradas</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedCompany(company)}
                className="mt-2 w-full py-2.5 bg-white/5 hover:bg-cyan-600 hover:text-white text-gray-300 text-xs font-bold rounded-xl transition-all border border-white/10 hover:border-cyan-500/50"
              >
                Gestionar Sedes y Tarifas por Depto
              </button>
            </div>
          );
        })}
      </div>

      {companies.length === 0 && (
        <div className="py-20 text-center text-gray-500 text-sm italic">
          No hay empresas de envío registradas.
        </div>
      )}

      {/* Modal para editar tarifa / mapas de la empresa */}
      {editingCompany && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form
            onSubmit={saveQuickEdit}
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Editar Tarifas: {editingCompany.name}</h3>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Modalidad de Cobro</label>
                <select
                  value={editingCompany.modalidadCobro || "PAGO_EN_DESTINO"}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      modalidadCobro: e.target.value as ModalidadCobroEnvio,
                      costoEstimadoBOB: e.target.value === "PAGO_EN_DESTINO" ? 0 : editingCompany.costoEstimadoBOB,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                >
                  <option value="PAGO_EN_DESTINO">Pago en Destino (Costo 0 en tienda)</option>
                  <option value="TARIFA_FIJA">Tarifa Fija (Prepagada)</option>
                  <option value="POR_COORDINAR">Por Coordinar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Costo Estimado (BOB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  disabled={editingCompany.modalidadCobro === "PAGO_EN_DESTINO"}
                  value={editingCompany.modalidadCobro === "PAGO_EN_DESTINO" ? 0 : (editingCompany.costoEstimadoBOB ?? 0)}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      costoEstimadoBOB: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Tiempo Estimado de Entrega</label>
                <input
                  type="text"
                  value={editingCompany.tiempoEstimadoHoras || "24 a 48 horas hábiles"}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      tiempoEstimadoHoras: e.target.value,
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Link de Google Maps</label>
                <input
                  type="url"
                  value={editingCompany.googleMapsUrl || ""}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      googleMapsUrl: e.target.value.trim() || undefined,
                    })
                  }
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="px-5 py-2 text-gray-400 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal para gestionar sedes y sucursales */}
      {selectedCompany && (
        <BranchManagerModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Previsualizador de mapa */}
      {previewMap && (
        <MapPreviewModal
          title={previewMap.title}
          subtitle={previewMap.subtitle}
          url={previewMap.url}
          onClose={() => setPreviewMap(null)}
        />
      )}
    </div>
  );
}
