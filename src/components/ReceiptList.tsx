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
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Printer,
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
  const [selectedYearFilter, setSelectedYearFilter] =
    useState<string>('Toutes');
  const [sortBy, setSortBy] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc');
  const [showAll, setShowAll] = useState(false);

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

  const handleExportPDF = () => {
    if (!isPremium) {
      onSubscribeClick?.();
      return;
    }

    if (receipts.length === 0) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(
        'Veuillez autoriser les pop-ups pour pouvoir générer et imprimer le rapport PDF.',
      );
      return;
    }

    const today = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const userEmail =
      localStorage.getItem('scanner_user_session') || 'Utilisateur SmartScan';

    const totalAmountAll = receipts.reduce((acc, r) => acc + r.totalAmount, 0);

    // Group by category to show statistics
    const catTotals: Record<string, number> = {};
    receipts.forEach((r) => {
      r.items.forEach((it) => {
        catTotals[it.category] = (catTotals[it.category] || 0) + it.price;
      });
    });

    let receiptsHtml = '';
    receipts.forEach((r) => {
      const itemsList = r.items
        .map(
          (it) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-size: 11px; color: #1f2937;">${
            it.name
          }</td>
          <td style="padding: 8px 0; font-size: 11px; color: #4b5563; text-align: center;">${
            it.category
          }</td>
          <td style="padding: 8px 0; font-size: 11px; color: #1f2937; text-align: right; font-family: monospace;">${
            it.quantity
          }</td>
          <td style="padding: 8px 0; font-size: 11px; color: #1f2937; text-align: right; font-family: monospace;">${it.price.toFixed(
            2,
          )} €</td>
        </tr>
      `,
        )
        .join('');

      receiptsHtml += `
        <div style="margin-bottom: 24px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 14px; color: #111827; font-weight: bold;">${
                r.merchant
              }</h3>
              <span style="font-size: 11px; color: #6b7280;">Date : ${
                r.date
              }</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 16px; color: #059669; font-weight: bold; font-family: monospace;">${r.totalAmount.toFixed(
                2,
              )} €</span>
              <div style="font-size: 9px; color: #9ca3af;">TVA approx : ${(
                r.taxAmount || 0
              ).toFixed(2)} €</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb; text-align: left;">
                <th style="padding-bottom: 6px; font-size: 10px; color: #9ca3af; text-transform: uppercase;">Article</th>
                <th style="padding-bottom: 6px; font-size: 10px; color: #9ca3af; text-transform: uppercase; text-align: center;">Catégorie</th>
                <th style="padding-bottom: 6px; font-size: 10px; color: #9ca3af; text-transform: uppercase; text-align: right;">Qté / Poids</th>
                <th style="padding-bottom: 6px; font-size: 10px; color: #9ca3af; text-transform: uppercase; text-align: right;">Prix Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
        </div>
      `;
    });

    const categorySummaryHtml = Object.entries(catTotals)
      .map(
        ([cat, total]) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; font-size: 12px;">
        <span style="color: #4b5563; font-weight: 500;">${cat}</span>
        <span style="font-family: monospace; font-weight: bold; color: #111827;">${total.toFixed(
          2,
        )} €</span>
      </div>
    `,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport de Comptabilité SmartScan</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #111827;
              margin: 40px;
              line-height: 1.4;
              background-color: #f3f4f6;
            }
            .page-container {
              max-width: 900px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            }
            @media print {
              body { 
                margin: 20px; 
                background-color: #ffffff;
              }
              .page-container {
                padding: 0;
                box-shadow: none;
                max-width: 100%;
              }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <!-- Floating Action Header for Preview Mode -->
          <div class="no-print" style="position: sticky; top: 10px; max-width: 900px; margin: 0 auto 24px auto; background-color: #18181b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); color: #ffffff; border: 1px solid #27272a;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background-color: #f59e0b; color: #09090b; padding: 3px 8px; font-size: 10px; font-weight: 900; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Aperçu</span>
              <span style="font-size: 13px; font-weight: 600; font-family: sans-serif;">Rapport de Comptabilité Premium PRO</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <button onclick="window.close()" style="background: transparent; border: 1px solid #3f3f46; color: #e4e4e7; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-family: sans-serif;">Fermer</button>
              <button onclick="window.print()" style="background-color: #10b981; border: none; color: #ffffff; padding: 8px 18px; font-size: 12px; font-weight: 800; border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); font-family: sans-serif;">Imprimer / Sauvegarder PDF</button>
            </div>
          </div>

          <div class="page-container">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111827; padding-bottom: 15px; margin-bottom: 30px;">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #111827; font-family: sans-serif;">SMARTSCAN <span style="font-weight: 300; font-size: 20px; color: #6b7280;">PREMIUM PRO</span></h1>
                <span style="font-size: 12px; color: #6b7280; font-family: sans-serif;">Rapport comptable PDF automatisé</span>
              </div>
              <div style="text-align: right; font-family: sans-serif;">
                <span style="font-size: 12px; color: #4b5563; display: block;">Généré le <strong>${today}</strong></span>
                <span style="font-size: 12px; color: #4b5563; display: block;">Compte : <strong>${userEmail}</strong></span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; background-color: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; font-family: sans-serif;">
              <div>
                <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Synthèse Globale</h2>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #4b5563; font-size: 13px;">Nombre total de tickets</span>
                  <span style="font-weight: bold; font-size: 14px; color: #111827;">${
                    receipts.length
                  }</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; align-items: center;">
                  <span style="color: #4b5563; font-size: 13px; font-weight: bold;">TOTAL CUMULÉ</span>
                  <span style="font-weight: 800; font-size: 20px; color: #059669; font-family: monospace;">${totalAmountAll.toFixed(
                    2,
                  )} €</span>
                </div>
              </div>
              <div>
                <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Répartition par Catégorie</h2>
                ${categorySummaryHtml}
              </div>
            </div>

            <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color: #111827; font-family: sans-serif;">Détail des Tickets de Caisse Scannés</h2>
            ${receiptsHtml}

            <div style="text-align: center; margin-top: 50px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; font-family: sans-serif;">
              SmartScan Premium PRO - Solution d'optimisation des dépenses et de comptabilité automatisée.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Check if any demo data exists
  const hasDemoData = receipts.some(
    (r) => r.id.startsWith('receipt-init-') || r.id.startsWith('receipt-demo-'),
  );

  // Extract dynamically sorted array of unique years from receipts for filtering
  const yearsPresent = Array.from(
    new Set(
      receipts
        .map((r) => {
          const d = new Date(r.date);
          return !isNaN(d.getTime()) ? d.getFullYear().toString() : '';
        })
        .filter((yr) => yr !== ''),
    ),
  ).sort((a, b) => b.localeCompare(a));

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

    const matchesYear =
      selectedYearFilter === 'Toutes' ||
      (() => {
        const d = new Date(receipt.date);
        return (
          !isNaN(d.getTime()) &&
          d.getFullYear().toString() === selectedYearFilter
        );
      })();

    return matchesSearch && matchesCategory && matchesYear;
  });

  // Sort receipt list
  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === 'date-asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'amount-desc') {
      return b.totalAmount - a.totalAmount;
    } else if (sortBy === 'amount-asc') {
      return a.totalAmount - b.totalAmount;
    }
    return 0;
  });

  // Limit items displayed based on expansion state
  const displayedReceipts = showAll
    ? sortedReceipts
    : sortedReceipts.slice(0, 6);

  // Calculate unique category set across all items in scanned receipts
  const categoriesPresent = Array.from(
    new Set(receipts.flatMap((r) => r.items.map((i) => i.category || 'Autre'))),
  );

  return (
    <div
      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
      id="receipt-list-container"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Historique des Tickets Numérisés
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-0.5">
            <span className="text-xs text-zinc-400">
              Trouvés :{' '}
              <span className="font-bold text-emerald-400 font-mono text-sm leading-none inline-block align-baseline">
                {filteredReceipts.length}
              </span>{' '}
              sur{' '}
              <span className="text-zinc-200 font-semibold">
                {receipts.length}
              </span>{' '}
              tickets
            </span>
            {filteredReceipts.length > 6 && !showAll && (
              <span className="text-[10px] text-zinc-500 bg-zinc-950/50 px-2 py-0.5 rounded-md border border-zinc-800/40 font-medium">
                (affichage de 6 éléments par défaut)
              </span>
            )}
            {hasDemoData && onClearDemo && (
              <button
                type="button"
                onClick={onClearDemo}
                className="text-[10px] font-bold text-amber-405 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/60 hover:border-amber-400/50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Supprimer les tickets d'exemple et d'entraînement pour ne garder que vos tickets réels"
              >
                Remettre à zéro les exemples 🧹
              </button>
            )}
          </div>
        </div>

        {/* Input search and dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1 md:w-44 xl:w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowAll(false);
              }}
              className="w-full h-9 pl-9 pr-4 bg-zinc-950 border border-zinc-700 hover:border-zinc-600 focus:border-zinc-500 focus:bg-zinc-950 text-xs font-semibold text-white placeholder-zinc-500 outline-none rounded-xl transition-all"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setShowAll(false);
              }}
              className="w-full h-9 sm:w-[155px] pl-3 pr-8 bg-zinc-950 border border-zinc-700 text-ellipsis hover:border-zinc-600 text-xs font-semibold text-zinc-300 rounded-xl outline-none appearance-none cursor-pointer"
            >
              <option value="Toutes">Toutes les catégories</option>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Year Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYearFilter}
              onChange={(e) => {
                setSelectedYearFilter(e.target.value);
                setShowAll(false);
              }}
              className="w-full h-9 sm:w-[115px] pl-3 pr-8 bg-zinc-950 border border-zinc-700 hover:border-zinc-600 text-xs font-semibold text-zinc-300 rounded-xl outline-none appearance-none cursor-pointer"
            >
              <option value="Toutes">Toutes les années</option>
              {yearsPresent.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Sorting Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-9 sm:w-[150px] pl-3 pr-8 bg-zinc-950 border border-zinc-700 hover:border-zinc-600 text-xs font-semibold text-zinc-300 rounded-xl outline-none appearance-none cursor-pointer"
            >
              <option value="date-desc">Plus récents d'abord</option>
              <option value="date-asc">Plus anciens d'abord</option>
              <option value="amount-desc">Montants max d'abord</option>
              <option value="amount-asc">Montants min d'abord</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={receipts.length === 0}
              className={`flex items-center gap-1.5 h-9 justify-center px-3.5 text-xs font-bold rounded-xl transition-all border cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                isPremium
                  ? 'bg-zinc-950 border-zinc-700 hover:border-emerald-500/40 text-emerald-400'
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
                  <span>Exporter Excel/CSV</span>
                </>
              ) : (
                <>
                  <Sparkles
                    size={12}
                    className="text-amber-400 animate-pulse shrink-0"
                  />
                  <span>
                    Excel/CSV{' '}
                    <span className="text-[8px] font-black font-sans text-amber-500 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/10 uppercase tracking-wide">
                      PRO
                    </span>
                  </span>
                </>
              )}
            </button>

            {/* Export PDF button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={receipts.length === 0}
              className={`flex items-center gap-1.5 h-9 justify-center px-3.5 text-xs font-bold rounded-xl transition-all border cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                isPremium
                  ? 'bg-zinc-950 border-zinc-700 hover:border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-400 text-amber-400'
              }`}
              title={
                isPremium
                  ? 'Exporter vos données sous forme de document PDF imprimable'
                  : "L'export PDF est réservé aux abonnés Premium PRO"
              }
            >
              {isPremium ? (
                <>
                  <Printer size={13} />
                  <span>Exporter en PDF</span>
                </>
              ) : (
                <>
                  <Sparkles
                    size={12}
                    className="text-amber-400 animate-pulse shrink-0"
                  />
                  <span>
                    Rapport PDF{' '}
                    <span className="text-[8px] font-black font-sans text-amber-500 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/10 uppercase tracking-wide">
                      PRO
                    </span>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Listing View */}
      {displayedReceipts.length === 0 ? (
        <div
          className="text-center py-12 border border-dashed border-zinc-700 rounded-2xl bg-zinc-950/30"
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
        <div className="space-y-6">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            id="receipts-grid"
          >
            {displayedReceipts.map((receipt) => {
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
                  className="group relative bg-zinc-950 border border-zinc-700 hover:border-emerald-500/40 hover:shadow-lg rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Calendar size={12} /> {formattedDate}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-white text-emerald-400">
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

          {/* Show More / Show Less Button */}
          {sortedReceipts.length > 6 && (
            <div className="flex justify-center pt-2" id="load-more-container">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-emerald-400 rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                {showAll ? (
                  <>
                    <ChevronUp
                      size={14}
                      className="text-emerald-400 animate-pulse"
                    />
                    <span>
                      Replier la liste (Masquer les tickets plus anciens)
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown
                      size={14}
                      className="text-emerald-400 animate-pulse"
                    />
                    <span>
                      Afficher les {sortedReceipts.length - 6} autres tickets de
                      caisse
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
