import Listing from "@/components/listing/Listing";
import { products } from "@/data/products";

// Table column headers for products
const productHeaders = [
  "Product Code",
  "Product Name",
  "Category",
  "Unit",
  "Description",
  "Supplier",
  "Rate",
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
