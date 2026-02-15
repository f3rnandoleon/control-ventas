
import { createUsuarioSchema } from "@/schemas/usuario.schema";
import { createProductoSchema } from "@/schemas/producto.schema";
import { createVentaSchema } from "@/schemas/venta.schema";

const printResult = (label: string, result: any) => {
    console.log(`\n--- ${label} ---`);
    if (result.success) {
        console.log("✅ VÁLIDO:", result.data);
    } else {
        console.log("❌ INVÁLIDO:");
        result.error.issues.forEach((issue: any) => {
            console.log(`   - ${issue.path.find((p: any) => typeof p === 'string') || issue.path.join(".")}: ${issue.message}`);
        });
    }
};

async function runDemo() {
    console.log("🔍 INICIANDO DEMOSTRACIÓN DE VALIDACIÓN ZOD");

    // CASO 1: Usuario Inválido
    const usuarioInvalido = {
        fullname: "Jo", // Muy corto
        email: "correo-falso", // Email inválido
        password: "123", // Muy corta
        role: "SUPER_ADMIN" as any // Rol no existente
    };
    console.log("\n🧪 CASO 1: Usuario con datos inválidos");
    const parsed1 = createUsuarioSchema.safeParse(usuarioInvalido);
    printResult("Resultado", parsed1);

    // CASO 2: Usuario Válido
    const usuarioValido = {
        fullname: "Juan Perez",
        email: "juan@example.com",
        password: "passwordSeguro123",
        role: "VENDEDOR",
        isActive: true
    };
    console.log("\n🧪 CASO 2: Usuario con datos válidos");
    const parsed2 = createUsuarioSchema.safeParse(usuarioValido);
    printResult("Resultado", parsed2);

    // CASO 3: Producto con precio costo > venta
    const productoInvalido = {
        nombre: "Camiseta",
        modelo: "Basica",
        precioVenta: 100,
        precioCosto: 150, // Error: Costo mayor a venta
        variantes: [{ color: "Rojo", talla: "M", stock: 10 }]
    };
    console.log("\n🧪 CASO 3: Producto con precio costo > venta");
    const parsed3 = createProductoSchema.safeParse(productoInvalido);
    printResult("Resultado", parsed3);

    // CASO 4: Venta inválida
    const ventaInvalida = {
        items: [], // Error: Array vacío
        metodoPago: "BITCOIN", // Error: Método inválido
        tipoVenta: "WEB" as any // Tipo inválido si solo se permite TIENDA/MAYORISTA
    };
    console.log("\n🧪 CASO 4: Venta inválida (sin items, pago incorrecto)");
    const parsed4 = createVentaSchema.safeParse(ventaInvalida);
    printResult("Resultado", parsed4);

    // CASO 5: Producto Válido SIN Variantes (Nuevo soporte)
    const productoSinVariantes = {
        nombre: "Bufanda Simple",
        modelo: "BUF-001",
        precioVenta: 50,
        precioCosto: 20
        // variantes es opcional ahora, se asume []
    };
    console.log("\n🧪 CASO 5: Producto válido sin variantes (Soporte Frontend)");
    const parsed5 = createProductoSchema.safeParse(productoSinVariantes);
    printResult("Resultado", parsed5);

    // CASO 6: Venta Válida Completa
    const ventaValida = {
        items: [
            { productoId: "507f1f77bcf86cd799439011", color: "Rojo", talla: "M", cantidad: 2 },
            { productoId: "507f1f77bcf86cd799439012", color: "Azul", talla: "L", cantidad: 1 }
        ],
        metodoPago: "QR",
        tipoVenta: "TIENDA",
        descuento: 0
    };
    console.log("\n🧪 CASO 6: Venta válida completa");
    const parsed6 = createVentaSchema.safeParse(ventaValida);
    printResult("Resultado", parsed6);

    // CASO 7: Venta con item inválido (cantidad negativa)
    const ventaItemNegativo = {
        items: [
            { productoId: "507f1f77bcf86cd799439011", color: "Rojo", talla: "M", cantidad: -5 }
        ],
        metodoPago: "EFECTIVO",
        tipoVenta: "TIENDA"
    };
    console.log("\n🧪 CASO 7: Venta con cantidad negativa");
    const parsed7 = createVentaSchema.safeParse(ventaItemNegativo);
    printResult("Resultado", parsed7);

    console.log("\n🏁 FIN DE LA DEMOSTRACIÓN");
}

runDemo().catch(console.error);
