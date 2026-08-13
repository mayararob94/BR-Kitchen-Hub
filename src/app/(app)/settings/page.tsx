import { getSettings, getSetting } from "@/lib/db/settings-db";
import { listBackups } from "@/lib/db/backup";
import { listWeeks, getActiveWeek } from "@/lib/db/weeks-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "./SettingsForm";
import { BackupPanel } from "./BackupPanel";
import { DataPanel } from "./DataPanel";
import { centsToDollars } from "@/lib/money";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const s = getSettings();
  const backups = listBackups();
  const weeks = listWeeks();
  const activeWeek = getActiveWeek();

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <SettingsForm
          initial={{
            businessName: s.businessName,
            tradingName: s.tradingName,
            tagline: s.tagline,
            invoiceFooterNote: s.invoiceFooterNote,
            abn: s.abn,
            address: s.address,
            phone: s.phone,
            email: s.email,
            website: s.website,
            bankAccountName: s.accountName,
            bankBsb: s.bsb,
            bankAccountNumber: s.accountNumber,
            bankPaymentInstructions: s.paymentInstructions,
            orderPrefix: s.orderPrefix,
            orderNext: String(s.orderNext),
            invoicePrefix: s.invoicePrefix,
            invoiceNext: String(s.invoiceNext),
            defaultDeliveryFeeDollars: centsToDollars(s.defaultDeliveryFeeCents),
            invoicePaperSize: s.invoicePaperSize,
            labelSize: s.labelSize,
            labelOrientation: s.labelOrientation,
            defaultBufferPct: getSetting("defaultBufferPct", "5"),
          }}
        />

        <BackupPanel backups={backups} />

        <DataPanel
          weeks={weeks.map((w) => ({
            id: w.id,
            label: formatWeekRange(w.weekStart, w.weekEnd),
          }))}
          activeWeekId={activeWeek?.id ?? null}
        />
      </div>
    </div>
  );
}
