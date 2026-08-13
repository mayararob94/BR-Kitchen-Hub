"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="New Customer" />
      <div className="card max-w-3xl p-5">
        <CustomerForm
          onSaved={(id) => router.push(`/customers/${id}`)}
          onCancel={() => router.push("/customers")}
        />
      </div>
    </div>
  );
}
