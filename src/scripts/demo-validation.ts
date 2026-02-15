
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

    // CASO 4: Venta sin items
    const ventaInvalida = {
        items: [], // Error: Array vacío
        metodoPago: "BITCOIN", // Error: Método inválido
        tipoVenta: "WEB"
    };
    console.log("\n🧪 CASO 4: Venta inválida");
    const parsed4 = createVentaSchema.safeParse(ventaInvalida);
    printResult("Resultado", parsed4);

    console.log("\n🏁 FIN DE LA DEMOSTRACIÓN");
}

runDemo().catch(console.error);
