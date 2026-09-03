import Listing from "@/components/listing/Listing";
import { suppliers } from "@/data/suppliers";

// Table column headers for suppliers
const supplierHeaders = [
  "Supplier Code",
  "Supplier Name",
  "Contact Person",
  "Mobile",
  "Email",
  "GST Number",
  "Status",
];

// Suppliers List Page
export default function SuppliersPage() {
  return (
    <Listing
      type="suppliers"
      title="Supplier Master"
      data={suppliers}
      heads={supplierHeaders}
    />
  );
}
