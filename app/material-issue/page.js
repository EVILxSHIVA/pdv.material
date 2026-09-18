import { Suspense } from "react";
import MaterialIssueForm from "@/components/forms/MaterialIssueForm";

export const metadata = {
  title: "Material Issue & Dispatch | PDV Material",
  description: "Warehouse dispatch and material allocation to project sites",
};

export default function MaterialIssuePage() {
  return (
    <Suspense fallback={<div style={{ padding: "30px", textAlign: "center" }}>Loading Material Issue...</div>}>
      <MaterialIssueForm />
    </Suspense>
  );
}
