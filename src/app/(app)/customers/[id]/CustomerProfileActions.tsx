"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Customer } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { setCustomerActiveAction } from "@/app/actions/customers";

export function CustomerProfileActions({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        className="btn-secondary"
        onClick={() =>
          startTransition(async () => {
            await setCustomerActiveAction(customer.id, !customer.isActive);
            router.refresh();
          })
        }
        disabled={pending}
      >
        {customer.isActive ? "Deactivate" : "Reactivate"}
      </button>
      <button className="btn-secondary" onClick={() => setEditing(true)}>
        Edit
      </button>
      <a
        href={`/orders/new?customerId=${customer.id}`}
        className="btn-primary"
      >
        Create Order
      </a>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Customer" wide>
        <CustomerForm
          customer={customer}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
