import InventoryView from "@/components/inventory/InventoryView";

export const metadata = {
  title: "Inventory Master | PDV Material",
  description: "Live calculated stock, warehouse availability, and catalog master",
};

export default function InventoryPage() {
  return <InventoryView />;
}
