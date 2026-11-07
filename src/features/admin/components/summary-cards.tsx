import { Building2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { AdminSummaryStats } from "../types";

interface SummaryCardsProps {
  stats: AdminSummaryStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      title: "Total UMKM",
      value: stats.totalUmkm,
      description: "Mitra terdaftar di sistem",
      icon: Building2,
      iconColor: "text-primary",
      iconBg: "bg-primary-soft",
      borderColor: "border-border",
    },
    {
      title: "UMKM Aktif",
      value: stats.activeUmkm,
      description: "Langganan aktif & berjalan",
      icon: CheckCircle2,
      iconColor: "text-accent-green",
      iconBg: "bg-green-50",
      borderColor: "border-border",
    },
    {
      title: "Segera Berakhir",
      value: stats.expiringSoonUmkm,
      description: "Masa aktif ≤ 7 hari",
      icon: AlertTriangle,
      iconColor: "text-accent-amber",
      iconBg: "bg-amber-50",
      borderColor: stats.expiringSoonUmkm > 0 ? "border-accent-amber/40" : "border-border",
    },
    {
      title: "Kedaluwarsa / Nonaktif",
      value: stats.expiredUmkm,
      description: "Perlu perpanjangan langganan",
      icon: XCircle,
      iconColor: "text-danger",
      iconBg: "bg-red-50",
      borderColor: stats.expiredUmkm > 0 ? "border-danger/30" : "border-border",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`rounded-xl border bg-bg p-5 shadow-xs transition-shadow hover:shadow-sm ${card.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-muted">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold tracking-tight text-text tabular-nums">
                {card.value}
              </span>
              <p className="mt-1 text-xs text-text-faint">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
