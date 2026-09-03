import Listing from "@/components/listing/Listing";
import { purchases } from "@/data/purchases";

// Table column headers for purchases
const purchaseHeaders = [
  "PI Number",
  "PI Date",
  "Supplier",
  "Quotation Number",
  "Total Items",
  "Total Amount",
  "Status",
];

// Purchases List Page
export default function PurchasesPage() {
  return (
    <Listing
      type="purchases"
      title="Purchase / PI"
      data={purchases}
      heads={purchaseHeaders}
    />
  );
}
