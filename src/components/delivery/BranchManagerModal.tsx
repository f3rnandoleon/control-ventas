"use client";

import { useState } from "react";
import { ShippingCompany, Department } from "@/types/delivery";

interface Props {
  company: ShippingCompany;
  onClose: () => void;
  onUpdate: (updatedCompany: ShippingCompany) => void;
}

export default function BranchManagerModal({ company, onClose, onUpdate }: Props) {
  const [activeDept, setActiveDept] = useState<string | null>(company.departments[0]?.name || null);
  const [newDeptName, setNewDeptName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    if (company.departments.some(d => d.name === newDeptName)) return;

    const newDept: Department = { name: newDeptName.trim(), branches: [] };
    onUpdate({
      ...company,
      departments: [...company.departments, newDept]
    });
    setNewDeptName("");
    setActiveDept(newDeptName);
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim() || !activeDept) return;
    
    const updatedDepts = company.departments.map(dept => {
      if (dept.name === activeDept) {
        return { ...dept, branches: [...dept.branches, newBranchName.trim()] };
      }
      return dept;
    });

    onUpdate({ ...company, departments: updatedDepts });
    setNewBranchName("");
  };

  const handleRemoveBranch = (deptName: string, branchName: string) => {
    const updatedDepts = company.departments.map(dept => {
      if (dept.name === deptName) {
        return { ...dept, branches: dept.branches.filter(b => b !== branchName) };
      }
      return dept;
    });
    onUpdate({ ...company, departments: updatedDepts });
  };

  const handleRemoveDept = (deptName: string) => {
    const updatedDepts = company.departments.filter(d => d.name !== deptName);
    onUpdate({ ...company, departments: updatedDepts });
    if (activeDept === deptName) setActiveDept(updatedDepts[0]?.name || null);
  };

  const currentDept = company.departments.find(d => d.name === activeDept);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Gestionar Sedes</h2>
            <p className="text-sm text-gray-400">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Departments List */}
          <div className="w-1/3 border-r border-white/10 p-6 space-y-6 overflow-y-auto bg-black/20">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">Departamentos</label>
              <div className="space-y-2">
                {company.departments.map((dept) => (
                  <div key={dept.name} className="group flex items-center gap-2">
                    <button
                      onClick={() => setActiveDept(dept.name)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeDept === dept.name 
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/40" 
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {dept.name}
                    </button>
                    <button 
                      onClick={() => handleRemoveDept(dept.name)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all"
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
                onChange={e => setNewDeptName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none mb-3"
              />
              <button
                onClick={handleAddDept}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
              >
                + Añadir Depto
              </button>
            </div>
          </div>

          {/* Branches List */}
          <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            {activeDept ? (
              <>
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Sucursales en {activeDept}</h3>
                    <p className="text-xs text-gray-500">{currentDept?.branches.length || 0} sedes registradas</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Nombre de la sucursal o dirección..."
                      value={newBranchName}
                      onChange={e => setNewBranchName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none"
                    />
                    <button
                      onClick={handleAddBranch}
                      className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {currentDept?.branches.map((branch, idx) => (
                      <div key={idx} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all">
                        <span className="text-sm text-gray-200">{branch}</span>
                        <button
                          onClick={() => handleRemoveBranch(activeDept, branch)}
                          className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {(!currentDept?.branches || currentDept.branches.length === 0) && (
                      <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                           <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </div>
                        <p className="text-gray-500 text-sm italic">No hay sucursales en este departamento.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 italic">
                <p>Selecciona un departamento para gestionar sus sucursales.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="p-6 border-t border-white/10 flex justify-end bg-black/20">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
          >
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}
