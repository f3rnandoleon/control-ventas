"use client";

import { useState } from "react";
import { ShippingCompany } from "@/types/delivery";
import { slugify } from "@/utils/slugify";
import BranchManagerModal from "./BranchManagerModal";

interface Props {
  companies: ShippingCompany[];
  onChange: (companies: ShippingCompany[]) => void;
}

export default function ShippingCompaniesManager({ companies, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<ShippingCompany | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newCompany: ShippingCompany = {
      id: slugify(newName),
      name: newName.trim(),
      departments: []
    };
    onChange([...companies, newCompany]);
    setNewName("");
  };

  const handleRemove = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta empresa? Se borrarán todas sus sucursales.")) {
      onChange(companies.filter((c) => c.id !== id));
    }
  };

  const handleUpdate = (updatedCompany: ShippingCompany) => {
    const updatedList = companies.map(c => c.id === updatedCompany.id ? updatedCompany : c);
    onChange(updatedList);
    setSelectedCompany(updatedCompany);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white">Empresas de Envío Nacional</h2>
        <p className="text-sm text-gray-400">Configura las empresas que realizan envíos a otros departamentos.</p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la empresa (ej: Trans Copacabana)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 outline-none transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg"
        >
          + Agregar Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {companies.map((company) => (
          <div 
            key={company.id}
            className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all duration-500 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 flex gap-2">
               <button
                onClick={() => handleRemove(company.id)}
                className="p-2 text-gray-500 hover:text-red-400 transition-all bg-black/20 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">{company.name}</h3>
              <p className="text-[10px] text-gray-500 font-mono italic">{company.id}</p>
            </div>

            <div className="flex gap-2 flex-wrap min-h-[2rem]">
              {company.departments.map(d => (
                <span key={d.name} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/20">
                  {d.name} ({d.branches.length})
                </span>
              ))}
              {company.departments.length === 0 && <span className="text-gray-600 text-xs italic">Sin sedes configuradas</span>}
            </div>

            <button
              onClick={() => setSelectedCompany(company)}
              className="mt-2 w-full py-2.5 bg-white/5 hover:bg-cyan-600 hover:text-white text-gray-300 text-xs font-bold rounded-xl transition-all border border-white/10 hover:border-cyan-500/50"
            >
              Gestionar Sedes
            </button>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="py-20 text-center text-gray-500 text-sm italic">
          No hay empresas de envío registradas.
        </div>
      )}

      {selectedCompany && (
        <BranchManagerModal 
          company={selectedCompany} 
          onClose={() => setSelectedCompany(null)} 
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
