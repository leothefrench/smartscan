import React, { useState } from "react";
import { Receipt, ReceiptItem, ReceiptCategory } from "../types";
import { CATEGORY_COLORS } from "../data/demoReceipts";
import { X, Trash2, Calendar, Store, CreditCard, Sparkles, Plus, Check } from "lucide-react";

interface ReceiptDetailsModalProps {
  receipt: Receipt;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (updatedReceipt: Receipt) => void;
}

export default function ReceiptDetailsModal({
  receipt,
  onClose,
  onDelete,
  onUpdate
}: ReceiptDetailsModalProps) {
  const [editableMerchant, setEditableMerchant] = useState(receipt.merchant);
  const [editableDate, setEditableDate] = useState(receipt.date);
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items);
  const [isSaved, setIsSaved] = useState(false);

  // Edit item category
  const handleCategoryChange = (itemId: string, newCat: ReceiptCategory) => {
    const updated = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, category: newCat };
      }
      return item;
    });
    setItems(updated);
  };

  // Delete item row
  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((item) => item.id !== itemId);
    setItems(updated);
  };

  // Submit changes
  const handleSave = () => {
    // Recompute total based on item pricing
    const newTotal = items.reduce((sum, item) => sum + item.price, 0);
    const updatedReceipt: Receipt = {
      ...receipt,
      merchant: editableMerchant,
      date: editableDate,
      items: items,
      totalAmount: Number(newTotal.toFixed(2))
    };
    onUpdate(updatedReceipt);
    setIsSaved(true);
    // Visual feedback then close modal automatically for better UX
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      style={{ margin: 0 }}
      id="receipt-modal-backdrop"
    >
      <div 
        className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slideUp text-white"
        id="receipt-modal-container"
      >
        {/* Header decoration */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit shrink-0">
              Analyse IA Complétée
            </span>
            {receipt.imageUrl && (
              <span className="text-[10px] sm:text-xs text-zinc-400 font-medium font-mono truncate max-w-[180px] sm:max-w-none">Image conservée localement</span>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Content (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-zinc-900">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/60">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nom du Commerçant</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-805 rounded-xl mt-1">
                <Store size={15} className="text-emerald-400" />
                <input 
                  type="text" 
                  value={editableMerchant}
                  onChange={(e) => setEditableMerchant(e.target.value)}
                  className="w-full text-sm font-semibold bg-transparent border-none focus:outline-none p-0 text-white"
                />
              </div>
            </div>

            <div className="space-y-1 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/60">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date de l'Achat</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl mt-1">
                <Calendar size={15} className="text-emerald-400" />
                <input 
                  type="date" 
                  value={editableDate}
                  onChange={(e) => setEditableDate(e.target.value)}
                  className="w-full text-sm font-semibold bg-transparent border-none focus:outline-none p-0 text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          {receipt.rawResponse && (
            <div className="bg-emerald-950/10 border border-emerald-900/40 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex gap-3 relative z-10">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl h-fit border border-emerald-500/25">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-300 block mb-0.5">Note de l'Assistant Gemini IA</span>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    "{receipt.rawResponse}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Physical Receipt Simulation */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-950 p-5 space-y-4">
            <div className="text-center pb-4 border-b border-dashed border-zinc-800">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Simulateur de ticket de caisse</div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1">{editableMerchant}</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">DATE: {editableDate} — DEV: {receipt.currency}</p>
            </div>

            {/* List of items */}
            <div className="space-y-3 font-mono">
              {items.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">Aucun article dans ce ticket</p>
              ) : (
                items.map((item) => {
                  return (
                    <div 
                      key={item.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-900 text-xs text-zinc-300 group"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          Quantité : {item.quantity} × {(item.price / item.quantity).toFixed(2)} {receipt.currency}
                        </div>
                      </div>

                      {/* Interactive Categorization Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={item.category}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value as ReceiptCategory)}
                          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 outline-none cursor-pointer hover:border-zinc-700"
                        >
                          {Object.keys(CATEGORY_COLORS).map((catName) => (
                            <option key={catName} value={catName}>
                              {catName}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 px-2 hover:bg-red-950/40 text-zinc-550 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer la ligne"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="text-right font-bold text-white min-w-[60px] self-end sm:self-center font-mono">
                        {item.price.toFixed(2)} {receipt.currency}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Receipt Summary Calculations */}
            <div className="pt-4 border-t border-dashed border-zinc-800">
              <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                {receipt.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Montant TVA :</span>
                    <span>{receipt.taxAmount.toFixed(2)} {receipt.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-900">
                  <span>Montant Total :</span>
                  <span className="text-emerald-400 font-extrabold">
                    {items.reduce((sum, item) => sum + item.price, 0).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: receipt.currency
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center text-[9px] text-zinc-600 font-mono text-center pt-2 select-none uppercase tracking-wide">
              **************** NUMÉRISATION SOUVERAINE ****************
            </div>
          </div>
        </div>

        {/* Modal Action Controls Footer */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-t border-zinc-850 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onDelete(receipt.id);
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 rounded-xl transition-all font-semibold text-xs cursor-pointer w-full sm:w-auto"
          >
            <Trash2 size={14} /> Supprimer le ticket
          </button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-850 rounded-xl transition-all font-semibold text-xs cursor-pointer text-center"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center justify-center gap-1 px-4 py-3 text-black font-semibold text-xs rounded-xl shadow-sm transition-all duration-300 cursor-pointer ${
                isSaved 
                  ? "bg-emerald-500 hover:bg-emerald-600 scale-95" 
                  : "bg-white hover:bg-zinc-100"
              }`}
            >
              {isSaved ? (
                <>
                  <Check size={14} className="animate-pulse" /> Modifié avec succès !
                </>
              ) : (
                <>Enregistrer les modifications</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
