import { getPoliticasPublicas } from "@/modules/ajustes/application/ajustes.service";
import PoliticaLayout from "@/components/web/PoliticaLayout";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Política de Privacidad | Fit Andes",
  description: "Tratamiento y protección de datos personales de los clientes de Fit Andes.",
};

export default async function PoliticaPrivacidadPage() {
  const politicas = await getPoliticasPublicas();
  const privacidad = politicas.privacidad;

  return (
    <PoliticaLayout
      titulo={privacidad.titulo || "Política de Privacidad"}
      subtitulo="Cómo recopilamos, usamos y protegemos tu información personal."
      ultimaActualizacion={privacidad.ultimaActualizacion}
    >
      <div className="prose prose-slate max-w-none whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
        {privacidad.contenido}
      </div>
    </PoliticaLayout>
  );
}
