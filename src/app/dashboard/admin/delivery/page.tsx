"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDeliveryOptions, updateDeliveryOptions } from "@/services/delivery.service";
import { DeliveryOptions } from "@/types/delivery";
import PickupPointsManager from "@/components/delivery/PickupPointsManager";
import PickupSchedulesManager from "@/components/delivery/PickupSchedulesManager";
import ShippingCompaniesManager from "@/components/delivery/ShippingCompaniesManager";

export default function AdminDeliveryPage() {
  const [options, setOptions] = useState<DeliveryOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"POINTS" | "SCHEDULES" | "SHIPPING">("POINTS");

  const loadOptions = async () => {
    try {
      setLoading(true);
      const data = await getDeliveryOptions();
      setOptions(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar opciones de entrega");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleSave = async (newOptions: DeliveryOptions) => {
    try {
      await updateDeliveryOptions(newOptions);
      setOptions(newOptions);
      toast.success("Opciones actualizadas correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar cambios";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-400 animate-pulse font-medium">Cargando opciones...</div>
      </div>
    );
  }

  if (!options) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Gestión de <span className="text-cyan-400">Entrega</span>
        </h1>
        <p className="text-gray-400 text-sm">
          Administra puntos de encuentro, horarios y empresas de envío nacional.
        </p>
      </header>

      {/* Tabs Navigation */}
      <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit backdrop-blur-md">
        <button
          onClick={() => setTab("POINTS")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === "POINTS"
              ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
        >
          Puntos de Encuentro
        </button>
        <button
          onClick={() => setTab("SCHEDULES")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === "SCHEDULES"
              ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
        >
          Horarios
        </button>
        <button
          onClick={() => setTab("SHIPPING")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === "SHIPPING"
              ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
        >
          Envíos Nacionales
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />

        {tab === "POINTS" && (
          <PickupPointsManager
            points={options.pickupPoints}
            onChange={(points) => handleSave({ ...options, pickupPoints: points })}
          />
        )}

        {tab === "SCHEDULES" && (
          <PickupSchedulesManager
            schedules={options.pickupSchedules}
            onChange={(schedules) => handleSave({ ...options, pickupSchedules: schedules })}
          />
        )}

        {tab === "SHIPPING" && (
          <ShippingCompaniesManager
            companies={options.shippingCompanies}
            onChange={(companies) => handleSave({ ...options, shippingCompanies: companies })}
          />
        )}
      </div>
    </div>
  );
}
