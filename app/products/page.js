import Listing from "@/components/listing/Listing";
import { products } from "@/data/products";

// Table column headers for products (All top-line fields from Excel)
const productHeaders = [
  "Product Code",
  "Material Description",
  "Size / Spec",
  "Category",
  "Unit",
  "Supplier",
  "Rate (₹)",
  "GST %",
  "PI / Invoice No",
  "PI Date",
  "Reorder Level",
  "Location",
  "Remarks",
  "Status",
];

// Products List Page
export default function ProductsPage() {
  return (
    <Listing
      type="products"
      title="Product Master"
      data={products}
      heads={productHeaders}
    />
  );
}
