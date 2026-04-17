import OrdersClient from "@/components/orders/OrdersClient";

export default function VendedorPedidosPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <OrdersClient role="VENDEDOR" />
    </div>
  );
}
