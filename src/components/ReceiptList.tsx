import React, { useState } from "react";
import { Receipt, ReceiptCategory } from "../types";
import { CATEGORY_COLORS } from "../data/demoReceipts";
import { Search, Filter, Calendar, FileText, ChevronRight, Eye } from "lucide-react";

interface ReceiptListProps {
  receipts: Receipt[];
  onSelectReceipt: (receipt: Receipt) => void;
  onClearDemo?: () => void;
}

export default function ReceiptList({ receipts, onSelectReceipt, onClearDemo }: ReceiptListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("Toutes");

  // Check if any demo data exists
  const hasDemoData = receipts.some(
    (r) => r.id.startsWith("receipt-init-") || r.id.startsWith("receipt-demo-")
  );

  // Filter receipt list
  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = 
      receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      selectedCategoryFilter === "Toutes" || 
      receipt.items.some((item) => item.category === selectedCategoryFilter);

    return matchesSearch && matchesCategory;
  });

  // Calculate unique category set across all items in scanned receipts
  const categoriesPresent = Array.from(
    new Set(receipts.flatMap((r) => r.items.map((i) => i.category || "Autre")))
  );

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6" id="receipt-list-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white tracking-tight">Historique des Tickets Numérisés</h2>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">
              Trouvés : <span className="font-semibold text-emerald-400 font-mono">{filteredReceipts.length}</span> sur {receipts.length} tickets
            </span>
            {hasDemoData && onClearDemo && (
              <button
                type="button"
                onClick={onClearDemo}
                className="text-[10px] font-bold text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/60 hover:border-amber-400/50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Supprimer les tickets d'exemple et d'entraînement pour ne garder que vos tickets réels"
              >
                🧹 Supprimer les exemples
              </button>
            )}
          </div>
        </div>

        {/* Input search and dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:bg-zinc-950 text-xs font-semibold text-white placeholder-zinc-500 outline-none rounded-xl transition-all"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 rounded-xl outline-none appearance-none cursor-pointer"
            >
              <option value="Toutes">Tous les articles</option>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-2.5 h-3 w-3 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Listing View */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30" id="empty-state">
          <FileText size={32} className="mx-auto text-zinc-650 mb-3" />
          <h3 className="text-sm font-bold text-zinc-400">Aucun ticket trouvé</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Ajustez vos filtres de recherche ou simulez un scan d'exemple ci-dessus pour observer le processus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="receipts-grid">
          {filteredReceipts.map((receipt) => {
            const dateObj = new Date(receipt.date);
            const formattedDate = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
              : receipt.date;

            // Extract main item categories inside this receipt for badges
            const receiptCategories = Array.from(
              new Set(receipt.items.map((it) => it.category))
            ).slice(0, 3); // max 3 inline previews

            return (
              <div
                key={receipt.id}
                onClick={() => onSelectReceipt(receipt)}
                className="group relative bg-zinc-950 border border-zinc-805 hover:border-emerald-500/30 hover:shadow-lg rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Calendar size={12} /> {formattedDate}
                    </span>
                    <span className="font-mono text-sm font-extrabold text-white">
                      {receipt.totalAmount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: receipt.currency
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {receipt.merchant}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {receipt.items.length} article{receipt.items.length > 1 ? "s" : ""} extrait{receipt.items.length > 1 ? "s textuels" : ""}
                  </p>
                </div>

                {/* Categories and Click Preview line */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-900 gap-2">
                  <div className="flex flex-wrap gap-1">
                    {receiptCategories.map((cat) => {
                      return (
                        <span
                          key={cat}
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800"
                        >
                          {cat}
                        </span>
                      );
                    })}
                  </div>

                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline group-hover:translate-x-0.5 transition-transform shrink-0">
                    Détails →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
