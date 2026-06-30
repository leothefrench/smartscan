import React, { useState, useMemo } from "react";
import { Receipt, ReceiptItem } from "../types";
import { 
  Sparkles, 
  ShoppingBag, 
  ChevronRight, 
  ArrowUpDown, 
  Info, 
  Store, 
  Maximize2, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  DollarSign, 
  Lock, 
  Tag, 
  ArrowRight,
  TrendingDown,
  Split,
  X,
  Check,
  Copy,
  CheckSquare,
  Square
} from "lucide-react";

interface PriceComparatorProps {
  receipts: Receipt[];
  isPremium: boolean;
  onSubscribeClick: () => void;
}

interface ComparableItem {
  id: string;
  name: string;
  merchant: string;
  price: number; // Unit price
  quantity: number;
  date: string;
  category: string;
}

interface ProductGroup {
  id: string;
  normalizedName: string;
  displayName: string;
  category: string;
  items: ComparableItem[];
  cheapestMerchant: string;
  cheapestPrice: number;
  highestPrice: number;
  highestMerchant: string;
  potentialSavings: number;
}

// Simple and robust string normalization
function normalizeProductName(name: string): string {
  if (!name) return "";
  let clean = name.toLowerCase().trim();
  
  // Remove accents
  clean = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Remove volume/weight patterns: 1L, 500g, x6, etc.
  clean = clean.replace(/\b\d+(g|kg|l|ml|cl|x\d+|%|pc|pax|gr)\b/g, "");
  clean = clean.replace(/\s\d+\s*(grammes|litres|cl|g|l)\b/g, "");
  
  // Remove punctuation
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  
  // Clean double spaces
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

// Helper to auto-detect weight items (grams, kilograms, etc.)
function isWeightItem(name: string, qty: number): boolean {
  const hasDecimal = qty % 1 !== 0;
  const isLessThanOne = qty > 0 && qty < 1;
  const hasWeightWords = /\b(kg|g|gr|grammes|kilo|kilos|boucherie|viande|steak|filet|charcuterie|traiteur|poids|poisson)\b/i.test(name);
  return hasDecimal || isLessThanOne || hasWeightWords;
}

// Group items that are similar
function groupSimilarItems(receiptItems: ComparableItem[]): ProductGroup[] {
  const groups: ProductGroup[] = [];
  
  receiptItems.forEach((item) => {
    const norm = normalizeProductName(item.name);
    if (!norm || norm.length < 3) return;
    
    // Find if a similar group already exists
    // Similar means: exact match of normalized name, or one contains the other, or they share high token overlap
    let foundGroup = groups.find((g) => {
      if (g.normalizedName === norm) return true;
      
      const words1 = g.normalizedName.split(" ").filter(w => w.length >= 3);
      const words2 = norm.split(" ").filter(w => w.length >= 3);
      
      if (words1.length === 0 || words2.length === 0) return false;
      
      // If one is a substring of another and they share at least one long word
      if ((g.normalizedName.includes(norm) || norm.includes(g.normalizedName)) && 
          words1.some(w => words2.includes(w))) {
        return true;
      }
      
      // Token overlap ratio
      const commonWords = words1.filter(w => words2.includes(w));
      const minLength = Math.min(words1.length, words2.length);
      if (minLength > 0 && commonWords.length / minLength >= 0.7) {
        return true;
      }
      
      return false;
    });
    
    if (foundGroup) {
      // Add item to existing group if not already added from same merchant
      // To avoid duplicate scans from same receipt or same store inflating comparison
      const alreadyHasMerchant = foundGroup.items.some(existing => existing.merchant === item.merchant);
      if (!alreadyHasMerchant) {
        foundGroup.items.push(item);
      } else {
        // If same merchant, keep the cheapest price for comparison
        const existingIdx = foundGroup.items.findIndex(existing => existing.merchant === item.merchant);
        if (existingIdx !== -1 && foundGroup.items[existingIdx].price > item.price) {
          foundGroup.items[existingIdx] = item;
        }
      }
    } else {
      // Create new group
      groups.push({
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        normalizedName: norm,
        displayName: item.name, // Will use first item as display name template
        category: item.category,
        items: [item],
        cheapestMerchant: "",
        cheapestPrice: 0,
        highestPrice: 0,
        highestMerchant: "",
        potentialSavings: 0
      });
    }
  });
  
  // Post-process groups to calculate cheapest/highest prices and savings
  groups.forEach((g) => {
    let cheapest = g.items[0];
    let highest = g.items[0];
    
    g.items.forEach((item) => {
      if (item.price < cheapest.price) cheapest = item;
      if (item.price > highest.price) highest = item;
    });
    
    g.cheapestMerchant = cheapest.merchant;
    g.cheapestPrice = cheapest.price;
    g.highestMerchant = highest.merchant;
    g.highestPrice = highest.price;
    g.potentialSavings = highest.price - cheapest.price;
  });
  
  // Only return groups that have been bought in at least 2 different merchants
  return groups.filter(g => g.items.length >= 2);
}

// Simulated receipts for demonstration mode
const DEMO_RECEIPTS: Receipt[] = [
  {
    id: "demo-comp-lidl",
    merchant: "Lidl",
    date: "2026-06-25",
    totalAmount: 18.29,
    taxAmount: 1.12,
    currency: "EUR",
    scannedAt: new Date().toISOString(),
    items: [
      { id: "demo-item-l1", name: "Lait demi-écrémé 1L", quantity: 1, price: 0.89, category: "Alimentation" },
      { id: "demo-item-l2", name: "Pâtes Barilla Penne 500g", quantity: 1, price: 1.15, category: "Alimentation" },
      { id: "demo-item-l3", name: "Coca-Cola Original 1.5L", quantity: 1, price: 1.65, category: "Alimentation" },
      { id: "demo-item-l4", name: "Pâte à tartiner Nutella 400g", quantity: 1, price: 3.10, category: "Alimentation" },
      { id: "demo-item-l5", name: "Lessive liquide Ariel", quantity: 1, price: 6.50, category: "Santé & Hygiène" }
    ]
  },
  {
    id: "demo-comp-carrefour",
    merchant: "Carrefour",
    date: "2026-06-26",
    totalAmount: 21.45,
    taxAmount: 1.35,
    currency: "EUR",
    scannedAt: new Date().toISOString(),
    items: [
      { id: "demo-item-c1", name: "Lait demi-écrémé Carrefour", quantity: 1, price: 0.95, category: "Alimentation" },
      { id: "demo-item-c2", name: "Pâtes Barilla Spaghetti", quantity: 1, price: 1.25, category: "Alimentation" },
      { id: "demo-item-c3", name: "Coca-Cola bouteille 1.5L", quantity: 1, price: 1.80, category: "Alimentation" },
      { id: "demo-item-c4", name: "Nutella Ferrero 400g", quantity: 1, price: 3.45, category: "Alimentation" },
      { id: "demo-item-c5", name: "Lessive liquide Ariel Original", quantity: 1, price: 7.20, category: "Santé & Hygiène" }
    ]
  },
  {
    id: "demo-comp-monoprix",
    merchant: "Monoprix",
    date: "2026-06-27",
    totalAmount: 26.15,
    taxAmount: 1.80,
    currency: "EUR",
    scannedAt: new Date().toISOString(),
    items: [
      { id: "demo-item-m1", name: "Lait GrandLait demi-écrémé", quantity: 1, price: 1.20, category: "Alimentation" },
      { id: "demo-item-m2", name: "Pâtes Barilla Spaghetti N.5", quantity: 1, price: 1.45, category: "Alimentation" },
      { id: "demo-item-m3", name: "Coca-Cola Classic", quantity: 1, price: 1.95, category: "Alimentation" },
      { id: "demo-item-m4", name: "Nutella Pâte à tartiner", quantity: 1, price: 3.80, category: "Alimentation" },
      { id: "demo-item-m5", name: "Lessive liquide Ariel Ultra", quantity: 1, price: 8.90, category: "Santé & Hygiène" }
    ]
  }
];

export default function PriceComparator({ receipts, isPremium, onSubscribeClick }: PriceComparatorProps) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(receipts.length < 2);
  const [activeView, setActiveView] = useState<"product" | "store">("product"); // "product" = default, "store" = optimized shop list
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);

  const toggleItemCheck = (itemName: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Compile active receipts depending on demo mode toggle
  const activeReceiptsSource = useMemo(() => {
    return isDemoMode ? DEMO_RECEIPTS : receipts;
  }, [isDemoMode, receipts]);

  // Extract all comparable items
  const allComparableItems = useMemo(() => {
    const items: ComparableItem[] = [];
    activeReceiptsSource.forEach((r) => {
      r.items.forEach((item) => {
        items.push({
          id: item.id,
          name: item.name,
          merchant: r.merchant,
          price: item.price / (item.quantity || 1), // calculate unit price
          quantity: item.quantity,
          date: r.date,
          category: item.category
        });
      });
    });
    return items;
  }, [activeReceiptsSource]);

  // Group similar items
  const productGroups = useMemo(() => {
    return groupSimilarItems(allComparableItems);
  }, [allComparableItems]);

  // Calculate overall savings statistics
  const totalPotentialSavings = useMemo(() => {
    return productGroups.reduce((sum, g) => sum + g.potentialSavings, 0);
  }, [productGroups]);

  // Distribute products by Store, showing ONLY the cheapest items in each store!
  const optimizedStores = useMemo(() => {
    const storeMap: Record<string, { items: { productName: string; price: number; savings: number; category: string; isWeight: boolean }[]; totalSavings: number }> = {};
    
    productGroups.forEach((g) => {
      const cheapestStore = g.cheapestMerchant;
      const cheapestPrice = g.cheapestPrice;
      const highestPrice = g.highestPrice;
      const savings = highestPrice - cheapestPrice;
      
      if (!storeMap[cheapestStore]) {
        storeMap[cheapestStore] = { items: [], totalSavings: 0 };
      }
      
      const firstItem = g.items[0];
      const isWeight = isWeightItem(g.displayName, firstItem ? firstItem.quantity : 1);
      
      storeMap[cheapestStore].items.push({
        productName: g.displayName,
        price: cheapestPrice,
        savings: savings,
        category: g.category,
        isWeight
      });
      storeMap[cheapestStore].totalSavings += savings;
    });
    
    return Object.entries(storeMap).map(([storeName, data]) => ({
      storeName,
      items: data.items,
      totalSavings: data.totalSavings
    })).sort((a, b) => b.totalSavings - a.totalSavings);
  }, [productGroups]);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl overflow-hidden p-6 space-y-6" id="price-comparator-section">
      {/* Header and Teaser Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
            <TrendingDown size={20} className="text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
                Comparateur de Prix Intelligent
              </h3>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 uppercase tracking-wider leading-none">
                PREMIUM ✨
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-normal max-w-xl">
              Identifiez automatiquement les produits identiques achetés dans différentes enseignes et optimisez vos paniers d'achat pour économiser jusqu'à 30%.
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shrink-0"
        >
          <span>{isOpen ? "Masquer le comparateur" : "Ouvrir le comparateur"}</span>
          <ChevronRight size={14} className={`transform transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 animate-fadeIn pt-4 border-t border-zinc-800/80">
          
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">Source :</span>
              <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDemoMode(false)}
                  disabled={receipts.length < 2}
                  className={`px-3 py-1 text-[10.5px] font-bold rounded-md transition-all ${
                    !isDemoMode 
                      ? "bg-zinc-850 text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-300 disabled:opacity-40 cursor-pointer"
                  }`}
                  title={receipts.length < 2 ? "Scannez au moins 2 tickets différents pour comparer vos propres achats" : "Vos vrais achats scannés"}
                >
                  Mes tickets ({receipts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemoMode(true)}
                  className={`px-3 py-1 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                    isDemoMode 
                      ? "bg-zinc-850 text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Simulation Démo
                </button>
              </div>
              {receipts.length < 2 && !isDemoMode && (
                <div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                  <Info size={11} />
                  <span>2 tickets requis (Mode démo actif)</span>
                </div>
              )}
            </div>

            {/* Main Tabs Selection (Solution B: View by Store Optimized vs Standard Product View) */}
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveView("product")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "product" 
                    ? "bg-amber-500 text-zinc-950 shadow-md font-extrabold" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Tag size={12} />
                Vue par Produit
              </button>
              <button
                type="button"
                onClick={() => setActiveView("store")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "store" 
                    ? "bg-amber-500 text-zinc-950 shadow-md font-extrabold" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Affiche le magasin idéal pour chaque produit pour maximiser l'économie globale !"
              >
                <Split size={12} />
                Panier Intelligent par Enseigne 🛒
              </button>
            </div>
          </div>

          {/* Premium Lock Wrapper */}
          <div className="relative">
            {!isPremium && (
              <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-amber-500/20">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30 mb-4 animate-bounce">
                  <Lock size={24} />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                  Comparateur Intelligent Réservé aux Membres PRO
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-5">
                  Ne gaspillez plus votre budget ! Débloquez l'analyse comparative des prix et visualisez instantanément le panier d'achat optimal réparti par enseigne.
                </p>
                <button
                  type="button"
                  onClick={onSubscribeClick}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-950/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles size={14} />
                  S'abonner & Débloquer PRO
                </button>
              </div>
            )}

            <div className={`space-y-6 ${!isPremium ? "select-none pointer-events-none opacity-40 blur-[1.5px]" : ""}`}>
              
              {/* Savings callout header */}
              {productGroups.length > 0 ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                      <TrendingDown size={16} />
                    </span>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Économie Optimale Potentielle</span>
                      <p className="text-xs text-zinc-200">
                        Vous pouvez économiser jusqu'à <strong className="text-emerald-400 font-extrabold font-mono text-sm">{totalPotentialSavings.toFixed(2)} €</strong> sur ces achats récurrents en achetant chaque produit là où il est le moins cher.
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/20 shrink-0 text-center sm:text-right">
                    <span className="text-xs text-zinc-400 block font-medium">Baisse estimée</span>
                    <span className="text-sm font-black font-mono text-emerald-400">
                      - {((totalPotentialSavings / productGroups.reduce((s, g) => s + g.highestPrice, 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 text-center space-y-2">
                  <AlertCircle className="mx-auto text-zinc-600" size={24} />
                  <p className="text-xs text-zinc-400">
                    Aucun produit similaire détecté dans différentes enseignes pour le moment.
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-normal max-w-md mx-auto">
                    Pour générer des comparaisons, scannez des reçus de magasins différents (ex: Lidl, Carrefour, E.Leclerc) contenant des produits de marques et types similaires. Vous pouvez aussi basculer sur le bouton "Simulation Démo" ci-dessus pour observer le fonctionnement réel de l'outil !
                  </p>
                </div>
              )}

              {productGroups.length > 0 && activeView === "product" && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Liste comparative détaillée ({productGroups.length} produits)
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productGroups.map((group) => (
                      <div 
                        key={group.id}
                        className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h5 className="text-xs font-bold text-white line-clamp-1">{group.displayName}</h5>
                              <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">{group.category}</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                              - {group.potentialSavings.toFixed(2)} €
                            </span>
                          </div>

                          {/* Prices bar charts */}
                          <div className="space-y-2 my-4">
                            {group.items.map((item) => {
                              const isCheapest = item.merchant === group.cheapestMerchant;
                              const isHighest = item.merchant === group.highestMerchant && group.items.length > 1;
                              const percent = (item.price / group.highestPrice) * 100;
                              
                              return (
                                <div key={item.merchant} className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="flex items-center gap-1 font-semibold text-zinc-300">
                                      <Store size={10} className="text-zinc-500" />
                                      {item.merchant}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-mono font-bold ${isCheapest ? "text-emerald-400" : isHighest ? "text-red-400" : "text-zinc-300"}`}>
                                        {item.price.toFixed(2)} €{isWeightItem(item.name, item.quantity) ? "/kg" : "/u"}
                                      </span>
                                      {isCheapest && (
                                        <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 rounded uppercase font-semibold border border-emerald-900">Le moins cher</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                                    <div 
                                      className={`h-full rounded-full ${isCheapest ? "bg-emerald-500" : isHighest ? "bg-red-500/60" : "bg-zinc-650"}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="text-[9px] text-zinc-500 italic border-t border-zinc-900 pt-2 flex justify-between items-center mt-2 leading-none">
                          <span>Achetez chez {group.cheapestMerchant}</span>
                          <span>Économisez {((group.potentialSavings / group.highestPrice) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solution B: Optimized Shopping Lists distributed by Store */}
              {productGroups.length > 0 && activeView === "store" && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 mt-0.5 shrink-0">
                        <Split size={13} className="text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">Répartition Optimisée par Magasin</span>
                        <p className="text-[10.5px] text-zinc-400 leading-normal">
                          Pour maximiser vos gains, n'achetez pas tout au même endroit ! Voici votre liste de courses répartie intelligemment : chaque produit apparaît <strong>uniquement</strong> dans l'enseigne où il est le moins cher.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {optimizedStores.map((store) => (
                      <div 
                        key={store.storeName}
                        onClick={() => setSelectedStoreName(store.storeName)}
                        className="bg-zinc-950 border border-zinc-900 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] group shadow-lg"
                        title="Toucher pour ouvrir la liste interactive de ce magasin"
                      >
                        <div className="space-y-3">
                          {/* Store title */}
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-zinc-900 text-zinc-300 rounded-lg border border-zinc-800 shrink-0 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                                <Store size={13} />
                              </span>
                              <span className="text-xs font-extrabold text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">{store.storeName}</span>
                            </div>
                            <span className="text-[10.5px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                              + {store.totalSavings.toFixed(2)} €
                            </span>
                          </div>

                          {/* List of items that are cheapest at this store */}
                          <div className="space-y-2">
                            {store.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start gap-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900">
                                <div className="min-w-0">
                                  <span className="text-[11px] font-bold text-zinc-100 block truncate" title={item.productName}>
                                    {item.productName}
                                  </span>
                                  <span className="text-[8.5px] text-zinc-500 block">
                                    Moins cher ici
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[11px] font-mono font-extrabold text-white block">
                                    {item.price.toFixed(2)} €
                                  </span>
                                </div>
                              </div>
                            ))}
                            {store.items.length > 3 && (
                              <p className="text-[10px] text-zinc-500 text-center italic pt-1">
                                + {store.items.length - 3} autre{store.items.length - 3 > 1 ? "s" : ""} article{store.items.length - 3 > 1 ? "s" : ""}...
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-zinc-900">
                          <div className="text-center leading-none">
                            <span className="text-[9.5px] text-zinc-400 font-medium">
                              {store.items.length} produit{store.items.length > 1 ? "s" : ""} à acheter ici
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-amber-400 font-bold flex items-center justify-center gap-1.5 bg-amber-500/5 py-2 rounded-xl border border-amber-500/15 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all">
                            <ShoppingBag size={11} className="animate-pulse" />
                            <span>Lancer ma liste de courses</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Checklist Modal for Selected Store */}
          {selectedStoreName && (() => {
            const storeData = optimizedStores.find(s => s.storeName === selectedStoreName);
            if (!storeData) return null;

            const completedCount = storeData.items.filter(it => checkedItems[it.productName]).length;
            const progressPercent = storeData.items.length > 0 
              ? Math.round((completedCount / storeData.items.length) * 100) 
              : 0;

            const getStoreInsight = (name: string) => {
              const lower = name.toLowerCase();
              if (lower.includes("lidl")) {
                return "💡 Lidl propose les meilleurs tarifs sur le rayon frais de marque propre. Idéal pour optimiser ce panier d'articles laitiers !";
              } else if (lower.includes("carrefour")) {
                return "💡 Carrefour offre un excellent cumul de fidélité. N'oubliez pas de passer votre carte de fidélité pour cagnotter de l'argent réel sur ces articles !";
              } else if (lower.includes("monoprix")) {
                return "💡 Monoprix a une qualité supérieure mais des prix plus élevés. Profitez des remises immédiates pour limiter le coût total.";
              }
              return "💡 Achetez ces articles spécifiques dans cette enseigne car ils y ont été identifiés au meilleur prix d'après vos tickets scannés.";
            };

            const handleCopyList = () => {
              const text = `🛒 Ma Liste de Courses SmartScan chez ${selectedStoreName} :\n` +
                storeData.items.map(it => `- [${checkedItems[it.productName] ? "x" : " "}] ${it.productName} (${it.price.toFixed(2)} €)`).join("\n") +
                `\n\nÉconomie estimée grâce à SmartScan : ${storeData.totalSavings.toFixed(2)} € !`;
              
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };

            return (
              <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="store-checklist-modal">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="text-amber-400 shrink-0" size={18} />
                        <h4 className="text-base font-black text-white uppercase tracking-tight">{selectedStoreName}</h4>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Votre liste optimisée pour maximiser vos économies de <span className="text-emerald-400 font-bold">+{storeData.totalSavings.toFixed(2)} €</span>
                      </p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedStoreName(null);
                        setCopied(false);
                      }}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Checklist Content */}
                  <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold">Progression de vos achats</span>
                        <span className="font-bold text-amber-400 font-mono">{completedCount} / {storeData.items.length} ({progressPercent}%)</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Checkbox Checklist */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Articles à cocher en magasin</span>
                      <div className="space-y-2">
                        {storeData.items.map((item, idx) => {
                          const isChecked = !!checkedItems[item.productName];
                          return (
                            <div 
                              key={idx}
                              onClick={() => toggleItemCheck(item.productName)}
                              className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? "bg-emerald-950/10 border-emerald-500/20 text-zinc-400" 
                                  : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-white"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                  isChecked 
                                    ? "bg-emerald-500 border-emerald-500 text-zinc-950" 
                                    : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                                }`}>
                                  {isChecked && <Check size={14} strokeWidth={3} />}
                                </div>
                                <div className="min-w-0">
                                  <span className={`text-xs font-bold block truncate ${isChecked ? "line-through text-zinc-500" : "text-zinc-100"}`}>
                                    {item.productName}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">
                                    {item.category}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-mono font-bold block ${isChecked ? "text-zinc-500" : "text-white"}`}>
                                  {item.price.toFixed(2)} €
                                </span>
                                <span className="text-[9px] text-emerald-400 font-semibold block leading-none">
                                  -{item.savings.toFixed(2)} €
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Brand Smart Insight */}
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs text-zinc-350 leading-relaxed">
                      {getStoreInsight(selectedStoreName)}
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="p-6 border-t border-zinc-800 bg-zinc-950/30 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleCopyList}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>{copied ? "Liste copiée ! 🎉" : "Copier la liste (SMS/Notes)"}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStoreName(null);
                        setCopied(false);
                      }}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                    >
                      Terminer les courses
                    </button>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
