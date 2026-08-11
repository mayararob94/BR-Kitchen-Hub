"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, DatabaseBackup, RotateCcw } from "lucide-react";
import type { BackupFile } from "@/lib/db/backup";
import { createBackupAction, restoreBackupAction } from "@/app/actions/data";
import { formatDate } from "@/lib/format";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupPanel({ backups }: { backups: BackupFile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function createBackup() {
    setMessage(null);
    startTransition(async () => {
      const res = await createBackupAction();
      setMessage(`Backup created: ${res.name}`);
      router.refresh();
    });
  }

  function restore(name: string) {
    if (
      !window.confirm(
        `Restore from "${name}"?\n\nThis REPLACES all current data. A safety backup of the current database is taken first, so you can undo. Continue?`
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      const res = await restoreBackupAction(name);
      setMessage(
        `Restored from ${name}. A safety copy of your previous data was saved as ${res.safetyCopy}.`
      );
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-gray-900">
            Backup Data
          </h2>
          <p className="text-sm text-gray-500">
            Backups are timestamped and never overwrite existing files. Stored in the
            local <code className="text-xs">/backups</code> folder.
          </p>
        </div>
        <button className="btn-primary" onClick={createBackup} disabled={pending}>
          <DatabaseBackup size={16} /> Create Backup
        </button>
      </div>

      {message && (
        <div className="mb-3 rounded-lg border border-tropical-200 bg-tropical-50 p-2 text-sm text-tropical-800">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="th">File</th>
              <th className="th">Created</th>
              <th className="th">Size</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {backups.map((b) => (
              <tr key={b.name} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{b.name}</td>
                <td className="td">{formatDate(b.createdAt)}</td>
                <td className="td">{humanSize(b.sizeBytes)}</td>
                <td className="td text-right">
                  <a
                    href={`/api/backup/download?name=${encodeURIComponent(b.name)}`}
                    className="btn-ghost text-xs"
                  >
                    <Download size={13} /> Download
                  </a>
                  <button
                    className="btn-ghost text-xs text-amber-700"
                    onClick={() => restore(b.name)}
                    disabled={pending}
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} className="td py-6 text-center text-gray-400">
                  No backups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
