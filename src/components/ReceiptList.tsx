import React, { useState } from 'react';
import { Receipt, ReceiptCategory } from '../types';
import { CATEGORY_COLORS } from '../data/demoReceipts';
import {
  Search,
  Filter,
  Calendar,
  FileText,
  ChevronRight,
  Eye,
  Download,
  Sparkles,
} from 'lucide-react';

interface ReceiptListProps {
  receipts: Receipt[];
  onSelectReceipt: (receipt: Receipt) => void;
  onClearDemo?: () => void;
  isPremium?: boolean;
  onSubscribeClick?: () => void;
}

export default function ReceiptList({
  receipts,
  onSelectReceipt,
  onClearDemo,
  isPremium = false,
  onSubscribeClick,
}: ReceiptListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('Toutes');

  const handleExportCSV = () => {
    if (!isPremium) {
      onSubscribeClick?.();
      return;
    }

    if (receipts.length === 0) return;

    // Generate CSV content
    // Headers: Date d'achat,Commerçant,Montant Total,Montant TVA,Devise,Catégories,Détails articles
    let csvContent = '';
    // UTF-8 BOM so Excel understands accented characters
    csvContent += '\uFEFF';
    csvContent +=
      "Date d'achat,Commerçant,Montant Total,Montant TVA,Devise,Catégories,Détails articles\n";

    receipts.forEach((r) => {
      const formattedMerchant = r.merchant.replace(/"/g, '""');
      const categories = Array.from(
        new Set(r.items.map((it) => it.category)),
      ).join('; ');
      const itemsDetails = r.items
        .map((it) => `${it.name} (${it.price}€ x ${it.quantity})`)
        .join(' | ')
        .replace(/"/g, '""');

      csvContent += `${r.date},"${formattedMerchant}",${r.totalAmount},${
        r.taxAmount || 0
      },${r.currency},"${categories}","${itemsDetails}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `smartscan_export_comptable_${
        new Date().toISOString().split('T')[0]
      }.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if any demo data exists
  const hasDemoData = receipts.some(
    (r) => r.id.startsWith('receipt-init-') || r.id.startsWith('receipt-demo-'),
  );

  // Filter receipt list
  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.items.some((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategoryFilter === 'Toutes' ||
      receipt.items.some((item) => item.category === selectedCategoryFilter);

    return matchesSearch && matchesCategory;
  });

  // Calculate unique category set across all items in scanned receipts
  const categoriesPresent = Array.from(
    new Set(receipts.flatMap((r) => r.items.map((i) => i.category || 'Autre'))),
  );

  return (
    <div
      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
      id="receipt-list-container"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Historique des Tickets Numérisés
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">
              Trouvés :{' '}
              <span className="font-semibold text-emerald-400 font-mono">
                {filteredReceipts.length}
              </span>{' '}
              sur {receipts.length} tickets
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

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={receipts.length === 0}
            className={`flex items-center gap-1.5 pl-3.5 pr-3.5 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
              isPremium
                ? 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/30 text-emerald-400'
                : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-400 text-amber-400'
            }`}
            title={
              isPremium
                ? "Exporter l'ensemble de vos données comptables au format Excel/CSV"
                : "L'export comptable est réservé aux abonnés Premium PRO"
            }
          >
            {isPremium ? (
              <>
                <Download size={13} />
                <span>Exporter en Excel/CSV</span>
              </>
            ) : (
              <>
                <Sparkles
                  size={12}
                  className="text-amber-400 animate-pulse shrink-0"
                />
                <span>
                  Exporter (CSV){' '}
                  <span className="text-[9px] font-black font-sans text-amber-500 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/10 uppercase tracking-wide">
                    PRO
                  </span>
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Listing View */}
      {filteredReceipts.length === 0 ? (
        <div
          className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30"
          id="empty-state"
        >
          <FileText size={32} className="mx-auto text-zinc-650 mb-3" />
          <h3 className="text-sm font-bold text-zinc-400">
            Aucun ticket trouvé
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Ajustez vos filtres de recherche ou simulez un scan d'exemple
            ci-dessus pour observer le processus.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          id="receipts-grid"
        >
          {filteredReceipts.map((receipt) => {
            const dateObj = new Date(receipt.date);
            const formattedDate = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : receipt.date;

            // Extract main item categories inside this receipt for badges
            const receiptCategories = Array.from(
              new Set(receipt.items.map((it) => it.category)),
            ).slice(0, 3); // max 3 inline previews

            return (
              <div
                key={receipt.id}
                onClick={() => onSelectReceipt(receipt)}
                className="group relative bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 hover:shadow-lg rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Calendar size={12} /> {formattedDate}
                    </span>
                    <span className="font-mono text-sm font-extrabold text-white">
                      {receipt.totalAmount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: receipt.currency,
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {receipt.merchant}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {receipt.items.length} article
                    {receipt.items.length > 1 ? 's' : ''} extrait
                    {receipt.items.length > 1 ? 's textuels' : ''}
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
