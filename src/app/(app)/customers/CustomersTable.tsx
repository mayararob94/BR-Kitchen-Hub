"use client";

import { useState } from "react";
import Link from "next/link";

interface Row {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  suburb: string;
  isActive: boolean;
}

export function CustomersTable({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(s) ||
      c.phone.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.suburb.toLowerCase().includes(s)
    );
  });

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 p-3">
        <input
          className="input max-w-sm"
          placeholder="Search name, phone, suburb, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Suburb</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="td">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {c.fullName}
                  </Link>
                </td>
                <td className="td">{c.phone || "—"}</td>
                <td className="td">{c.email || "—"}</td>
                <td className="td">{c.suburb || "—"}</td>
                <td className="td">
                  {c.isActive ? (
                    <span className="badge bg-tropical-100 text-tropical-800">Active</span>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td py-8 text-center text-gray-400" colSpan={5}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
