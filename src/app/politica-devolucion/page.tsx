import { getPoliticasPublicas } from "@/modules/ajustes/application/ajustes.service";
import PoliticaLayout from "@/components/web/PoliticaLayout";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Políticas de Devolución | Fit Andes",
  description: "Conoce las condiciones, plazos y pasos para cambios y devoluciones de prendas en Fit Andes.",
};

export default async function PoliticaDevolucionPage() {
  const politicas = await getPoliticasPublicas();
  const devoluciones = politicas.devoluciones;

  return (
    <PoliticaLayout
      titulo={devoluciones.titulo || "Políticas de Devolución y Cambios"}
      subtitulo={`Plazo máximo para solicitar devoluciones: ${devoluciones.diasLimiteDevolucion || 7} días calendario.`}
      ultimaActualizacion={devoluciones.ultimaActualizacion}
    >
      <div className="prose prose-slate max-w-none whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
        {devoluciones.contenido}
      </div>
    </PoliticaLayout>
  );
}
