import { getPoliticasPublicas } from "@/modules/ajustes/application/ajustes.service";
import PoliticaLayout from "@/components/web/PoliticaLayout";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Política de Cookies | Fit Andes",
  description: "Información sobre el uso de cookies y tecnologías similares en la web de Fit Andes.",
};

export default async function PoliticaCookiesPage() {
  const politicas = await getPoliticasPublicas();
  const cookies = politicas.cookies;

  return (
    <PoliticaLayout
      titulo={cookies.titulo || "Política de Cookies"}
      subtitulo="Cómo utilizamos cookies y tecnologías de almacenamiento local para mejorar tu experiencia."
      ultimaActualizacion={cookies.ultimaActualizacion}
    >
      <div className="prose prose-slate max-w-none whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
        {cookies.contenido}
      </div>
    </PoliticaLayout>
  );
}
