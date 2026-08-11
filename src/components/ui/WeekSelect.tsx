"use client";

import { useRouter } from "next/navigation";

export function WeekSelect({
  weeks,
  value,
  basePath,
}: {
  weeks: { id: number; label: string; status: string }[];
  value: number | null;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <select
      className="input"
      value={value ?? ""}
      onChange={(e) => router.push(`${basePath}?week=${e.target.value}`)}
    >
      {weeks.map((w) => (
        <option key={w.id} value={w.id}>
          {w.label}
          {w.status === "active" ? " ★" : ""}
        </option>
      ))}
      {weeks.length === 0 && <option value="">No weeks</option>}
    </select>
  );
}
