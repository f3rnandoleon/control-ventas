export function generarSKU(nombre: string, modelo: string): string {
  const limpiar = (texto: string) =>
    texto
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(" ")
      .filter(Boolean)
      .map(p => p.slice(0, 3))
      .join("-");

  return `${limpiar(nombre)}-${limpiar(modelo)}`;
}
