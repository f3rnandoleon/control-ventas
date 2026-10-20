import type { Compra, CrearCompraInput } from "@/types/compra";

export async function getCompras(): Promise<Compra[]> {
    const res = await fetch("/api/compras");

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al obtener compras");
    }

    return res.json();
}

export async function getCompra(id: string): Promise<Compra> {
    const res = await fetch(`/api/compras/${id}`);

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al obtener la compra");
    }

    return res.json();
}

export async function crearCompra(data: CrearCompraInput): Promise<{ message: string; compra: Compra }> {
    const res = await fetch("/api/compras", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al registrar la compra");
    }

    return res.json();
}

export async function anularCompra(id: string, motivo?: string): Promise<{ message: string; compra: Compra }> {
    const res = await fetch(`/api/compras/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ motivo }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al anular la compra");
    }

    return res.json();
}
