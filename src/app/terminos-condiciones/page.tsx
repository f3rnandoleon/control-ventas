import { getPoliticasPublicas } from "@/modules/ajustes/application/ajustes.service";
import PoliticaLayout from "@/components/web/PoliticaLayout";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Términos y Condiciones | Fit Andes",
  description: "Términos y condiciones de compra, pedidos y uso de la tienda en línea Fit Andes.",
};

export default async function TerminosCondicionesPage() {
  const politicas = await getPoliticasPublicas();
  const terminos = politicas.terminos;

  return (
    <PoliticaLayout
      titulo={terminos.titulo || "Términos y Condiciones"}
      subtitulo="Condiciones legales aplicables a todas las compras y uso de nuestra plataforma."
      ultimaActualizacion={terminos.ultimaActualizacion}
    >
      <div className="prose prose-slate max-w-none whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
        {terminos.contenido}
      </div>
    </PoliticaLayout>
  );
}
