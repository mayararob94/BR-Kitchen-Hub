import Link from "next/link";
import { listCustomers } from "@/lib/db/customers-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatPhone } from "@/lib/format";
import { CustomersTable } from "./CustomersTable";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  const customers = listCustomers();

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link href="/customers/import" className="btn-secondary">
              Import CSV
            </Link>
            <Link href="/customers/new" className="btn-primary">
              New Customer
            </Link>
          </>
        }
      />
      <CustomersTable
        customers={customers.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          phone: formatPhone(c.phone),
          email: c.email,
          suburb: c.suburb,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
