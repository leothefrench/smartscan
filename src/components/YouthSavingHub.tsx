import React, { useState } from "react";
import { Receipt } from "../types";
import { Sparkles, Coins, Coffee, Smartphone, Target, Zap, CheckCircle2, Award, ArrowRight, ShieldCheck, Check, Tv, Music, Plus, ShoppingBag, Trash2, X, AlertTriangle } from "lucide-react";
import StripeCheckoutModal from "./StripeCheckoutModal";

interface YouthSavingHubProps {
  receipts: Receipt[];
  isPremium: boolean;
  setIsPremium: (status: boolean) => void;
  userEmail: string | null;
  onSubscribeClick?: () => void;
  onAddSubscriptionReceipt?: (name: string, price: number) => void;
  onDeleteReceipt?: (id: string) => void;
}

export default function YouthSavingHub({ 
  receipts, 
  isPremium, 
  setIsPremium, 
  userEmail,
  onSubscribeClick,
  onAddSubscriptionReceipt,
  onDeleteReceipt
}: YouthSavingHubProps) {
  // 1. Calculate active spend on fast-food/delivery/quick snacks
  const fastFoodKeywords = ["resto", "restaurant", "burger", "mcdonald", "mcdo", "kfc", "pizza", "cafe", "ubereats", "deliveroo", "starbucks", "snack", "boulangerie"];
  const fastFoodSpend = receipts.reduce((sum, r) => {
    const isFastFoodMerchant = fastFoodKeywords.some(kw => r.merchant.toLowerCase().includes(kw));
    if (isFastFoodMerchant) {
      return sum + r.totalAmount;
    }
    // Also check individual item names
    const itemSpend = r.items.reduce((itemSum, item) => {
      const isFastFoodItem = fastFoodKeywords.some(kw => item.name.toLowerCase().includes(kw));
      if (isFastFoodItem) {
        return itemSum + item.price;
      }
      return itemSum;
    }, 0);
    return sum + itemSpend;
  }, 0);

  // Challenge settings
  const fastFoodThreshold = 60.0; // €60 limit per month
  const progressPercent = Math.min((fastFoodSpend / fastFoodThreshold) * 100, 100);

  // 2. Interactive simulator states
  const [coffeeCount, setCoffeeCount] = useState(4); // coffees per week
  const [subsCount, setSubsCount] = useState(1); // additional sliding general subscriptions

  // Notification status for Resiliation / Opération Annuelle
  const [savingsNotification, setSavingsNotification] = useState<{
    name: string;
    amount: number;
    freq: string;
    annualAmount: number;
  } | null>(null);

  const [showRetentionPrompt, setShowRetentionPrompt] = useState(false);
  
  // Track popularity configurations
  const subscriptionConfig = [
    { name: "Netflix", keywords: ["netflix"], price: 13.49, icon: Tv },
    { name: "Amazon Prime", keywords: ["prime", "amazon prime", "amazonprime"], price: 6.99, icon: ShoppingBag },
    { name: "Canal+", keywords: ["canal", "canal+", "canal plus", "mycanal"], price: 22.99, icon: Tv },
    { name: "Spotify", keywords: ["spotify"], price: 10.99, icon: Music },
  ];

  // Dynamic matching from scanned or added receipts (popular templates)
  const templatesWithMatch = subscriptionConfig.map(config => {
    const match = receipts.find(r => 
      config.keywords.some(kw => r.merchant.toLowerCase().includes(kw)) ||
      r.items.some(item => config.keywords.some(kw => item.name.toLowerCase().includes(kw)))
    );
    return {
      name: config.name,
      price: config.price,
      icon: config.icon,
      detected: !!match,
      amount: match ? match.totalAmount : config.price,
      date: match ? match.date : null,
      id: match ? match.id : null,
      recurrence: match?.recurrence || "monthly"
    };
  });

  // Extract custom recurring subscriptions (e.g. Neon, Fitness, Coaching)
  const customRecurringReceipts = receipts.filter(r => r.isRecurring);
  const matchedReceiptIds = new Set(templatesWithMatch.filter(t => t.id).map(t => t.id));
  
  const customRecurringList = customRecurringReceipts
    .filter(r => !matchedReceiptIds.has(r.id))
    .map(r => {
      let IconComponent = Smartphone;
      const lowerM = r.merchant.toLowerCase();
      if (lowerM.includes("gym") || lowerM.includes("sport") || lowerM.includes("fit") || lowerM.includes("salle")) IconComponent = Target;
      else if (lowerM.includes("coaching") || lowerM.includes("coach")) IconComponent = Award;
      else if (lowerM.includes("elec") || lowerM.includes("edf") || lowerM.includes("eau") || lowerM.includes("facture")) IconComponent = Zap;

      return {
        name: r.merchant,
        price: r.totalAmount,
        icon: IconComponent,
        detected: true,
        amount: r.totalAmount,
        date: r.date,
        id: r.id,
        recurrence: r.recurrence || "monthly"
      };
    });

  // Merge lists to keep the UI unified
  const allDetectedSubscriptions = [...templatesWithMatch, ...customRecurringList];

  // Calculate costs based on premium active subscriptions
  const detectedSubsCost = allDetectedSubscriptions
    .filter(s => s.detected)
    .reduce((sum, s) => {
      const freq = s.recurrence || "monthly";
      if (freq === "weekly") {
        return sum + (s.amount * 4.33);
      } else if (freq === "yearly") {
        return sum + (s.amount / 12);
      } else {
        return sum + s.amount;
      }
    }, 0);

  const weeklyCoffeeCost = coffeeCount * 3.50;
  const monthlyCoffeeCost = weeklyCoffeeCost * 4.33;
  const monthlySubsCost = (subsCount * 12.99) + detectedSubsCost;
  const totalMicroSpend = monthlyCoffeeCost + monthlySubsCost;
  const yearlyPotentialSavings = totalMicroSpend * 12;

  // Let's create an elegant cancel callback that computes the "Opération Annuelle" savings
  const handleCancelSubscription = (id: string, name: string, amount: number, recurrence: string) => {
    let annual = amount;
    if (recurrence === "weekly") {
      annual = amount * 52.14;
    } else if (recurrence === "monthly") {
      annual = amount * 12;
    }
    
    setSavingsNotification({
      name,
      amount,
      freq: recurrence === "weekly" ? "hebdomadaire" : recurrence === "yearly" ? "annuelle" : "mensuelle",
      annualAmount: Math.round(annual)
    });

    if (onDeleteReceipt && id) {
      onDeleteReceipt(id);
    }
  };

  // 3. Premium Checked Controls
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // 4. User Gamified Rank based on scans and total spend ratio
  const scanCount = receipts.length;
  let userRank = "Apprenti Économe";
  let rankColor = "text-zinc-400 bg-zinc-800";
  let rankDescription = "Commencez à scanner vos tickets de caisse pour débloquer votre statut et optimiser votre budget.";
  
  if (scanCount >= 8) {
    userRank = "Champion du Budget 👑";
    rankColor = "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30";
    rankDescription = "Exceptionnel ! Vous analysez systématiquement chaque flux pour préserver votre capital d'investissement.";
  } else if (scanCount >= 4) {
    userRank = "Ninja de l'Épargne 🥷";
    rankColor = "text-cyan-400 bg-cyan-950/40 border border-cyan-500/30";
    rankDescription = "Excellent rythme. Vous automatisez la traque de la TVA et de vos charges courantes.";
  } else if (scanCount > 0) {
    userRank = "Économe Actif ⚡";
    rankColor = "text-amber-400 bg-amber-950/40 border border-amber-500/30";
    rankDescription = "Bon début ! Continuez à enregistrer vos reçus pour dresser un historique et optimiser vos achats.";
  }

  return (
    <div className="space-y-6" id="youth-saving-hub">
      
      {/* Three Column Bento Grid: Challenge, Simulator, Premium Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Gamified Saving Challenge */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950/80 rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between relative overflow-hidden" id="challenge-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Target size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
                  Défi Épargne : Restauration & Plaisir 🍔
                </h3>
                <span className="text-[10px] text-zinc-400">Objectif mensuel maximal conseillé : {fastFoodThreshold} €</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              Le budget restauration extérieure (fast-foods, cafés, boulangeries, livraisons à domicile) est le premier pôle d'optimisation financière chez les particuliers souhaitant épargner efficacement.
            </p>

            {/* Progress gauge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-400">Cumulé identifié :</span>
                  <span className="font-mono text-emerald-400 font-bold">{fastFoodSpend.toFixed(2)} €</span>
                </div>
                <span className="text-zinc-400 font-semibold font-mono">
                  {progressPercent.toFixed(0)}% du seuil
                </span>
              </div>
              
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    progressPercent >= 100 
                      ? "bg-red-500" 
                      : progressPercent >= 80 
                      ? "bg-amber-500 animate-pulse" 
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                <span>0 € Scanné</span>
                {progressPercent >= 100 ? (
                  <span className="text-red-400 font-semibold">🚨 Seuil d'alerte dépassé - Privilégiez le fait-maison !</span>
                ) : progressPercent >= 80 ? (
                  <span className="text-amber-400 font-semibold">⚠️ Seuil proche</span>
                ) : (
                  <span className="text-emerald-400/90 font-semibold">✓ Budget sous contrôle</span>
                )}
                <span>{fastFoodThreshold} €</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Défi repas fait-maison</span>
            </div>
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider">
              Objectif Mensuel
            </span>
          </div>
        </div>

        {/* 2. Micro-Spend Multiplier Simulator */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-between" id="micro-spend-card">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                <Coins size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight leading-none font-sans">
                  Simulateur de Petits Frais
                </h3>
                <span className="text-[10px] text-zinc-400">Mesurez l'impact des dépenses récurrentes</span>
              </div>
            </div>

            <div className="space-y-4 font-sans">
              {/* Range 1: Coffee & snacks per week */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Coffee size={13} className="text-zinc-500" /> Cafés / Encas extérieurs
                  </span>
                  <span className="text-white bg-zinc-950 px-2 py-0.5 rounded font-mono text-[10px] border border-zinc-800">
                    {coffeeCount} / sem
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={coffeeCount}
                  onChange={(e) => setCoffeeCount(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Range 2: Apps and subscriptions */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Smartphone size={13} className="text-zinc-500" /> Autres services simulés
                  </span>
                  <span className="text-white bg-zinc-950 px-2 py-0.5 rounded font-mono text-[10px] border border-zinc-800">
                    {subsCount} services
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={subsCount}
                  onChange={(e) => setSubsCount(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Real / Detected Subscriptions Sub-section */}
              <div className="pt-3 border-t border-zinc-800/60 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Traqueur d'Abonnements</span>
                  <span className="text-[9px] text-zinc-500 lowercase font-medium">Détection & Rapprochement</span>
                </div>

                {savingsNotification && (
                  <div className="p-3 bg-emerald-950/65 border border-emerald-500/20 text-emerald-200 rounded-xl text-[10px] relative animate-fadeIn shadow-sm shadow-emerald-950/20 leading-relaxed font-sans">
                    <button 
                      type="button" 
                      onClick={() => setSavingsNotification(null)}
                      className="absolute top-2 right-2 text-emerald-400/80 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                    <div className="font-bold text-emerald-300 flex items-center gap-1 mb-1">
                      <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                      <span>Opération Annuelle Réussie !</span>
                    </div>
                    <div>
                      En supprimant l'abonnement <strong className="text-white">{savingsNotification.name}</strong>, vous économisez <strong className="text-white font-mono">{savingsNotification.amount.toFixed(2)} €</strong> {savingsNotification.freq}. Cela représente <strong className="text-emerald-300 font-bold">+{savingsNotification.annualAmount} € d'épargne par an</strong> qui cessent d'être gaspillés !
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  {allDetectedSubscriptions.map((sub) => {
                    const IconComponent = sub.icon;
                    return (
                      <div 
                        key={sub.name}
                        className={`flex flex-col justify-between p-2 rounded-xl border transition-all ${
                          sub.detected 
                            ? "bg-emerald-950/20 border-emerald-500/20 text-white shadow-sm shadow-emerald-900/10" 
                            : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-850"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`p-1 rounded-md shrink-0 ${sub.detected ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-600 bg-zinc-900"}`}>
                              <IconComponent size={11} />
                            </span>
                            <span className="text-[10px] font-bold truncate leading-none">{sub.name}</span>
                          </div>
                          
                          {sub.detected ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Actif et détecté" />
                              {sub.id && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelSubscription(sub.id!, sub.name, sub.amount, sub.recurrence)}
                                  className="text-zinc-500 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                                  title="Arrêter cet abonnement (Opération Annuelle)"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddSubscriptionReceipt?.(sub.name, sub.price)}
                              className="text-[9px] text-zinc-500 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 p-0.5 rounded cursor-pointer transition-colors"
                              title="Déclarer ce prélèvement"
                            >
                              <Plus size={10} />
                            </button>
                          )}
                        </div>
                        
                        <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono leading-none">
                          <span className={sub.detected ? "text-emerald-300 font-semibold" : "text-zinc-650"}>
                            {sub.amount.toFixed(2)} €
                            <span className="text-[7.5px] font-normal text-zinc-400 font-sans ml-0.5">
                              {sub.recurrence === "weekly" ? "/sem" : sub.recurrence === "yearly" ? "/an" : "/mois"}
                            </span>
                          </span>
                          <span className={`text-[7px] px-1 rounded-sm uppercase font-semibold leading-none ${
                            sub.detected 
                              ? "bg-emerald-950/80 text-emerald-400" 
                              : "bg-zinc-900/60 text-zinc-600"
                          }`}>
                            {sub.detected ? "Détecté" : "Absent"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[9px] text-zinc-500 leading-normal italic select-none">
                  {detectedSubsCost > 0 
                    ? `🎯 ${allDetectedSubscriptions.filter(s => s.detected).map(s => s.name).join(", ")} détecté${allDetectedSubscriptions.filter(s => s.detected).length > 1 ? "s" : ""} via vos charges récurrentes.`
                    : "💡 Vos abonnements (ex. Netflix, Prime, Canal+, salle de sport) s'activeront dès détection ou déclaration."
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic simulation outcomes */}
          <div className="mt-5 pt-3.5 border-t border-zinc-800 space-y-1.5 font-sans">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Coût mensuel identifié ：</span>
              <span className="font-semibold text-zinc-200 font-mono">
                {totalMicroSpend.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Épargne sur 1 an ：</span>
              <span className="font-extrabold text-emerald-400 font-mono text-sm">
                + {yearlyPotentialSavings.toFixed(0)} €
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 leading-normal italic text-center pt-2 select-none border-t border-dashed border-zinc-800">
              💡 Placer cette somme sur un plan d'épargne permet d'accélérer la constitution de votre patrimoine.
            </p>
          </div>
        </div>

        {/* 3. New Premium Tier Advantage Presentation Card */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 rounded-2xl p-6 border border-amber-500/20 flex flex-col justify-between relative overflow-hidden" id="premium-proposal-card">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          
          {showRetentionPrompt ? (
            <div className="space-y-4 animate-fadeIn flex-1 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <AlertTriangle size={16} className="animate-pulse" />
                  <h3 className="text-xs font-black tracking-wider uppercase">Attention Rétractation</h3>
                </div>
                <p className="text-[11px] text-zinc-300 leading-normal mb-3">
                  En renonçant à votre abonnement Premium PRO, vous abandonnez les engagements de qualité qui y sont attachés :
                </p>
                
                <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-900/80">
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span><strong>Analyses & Scans Illimités</strong> (limitation à un seuil d'essai gratuit)</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span><strong>Exportation Comptable complète</strong> (les exports Excel/CSV seront verrouillés)</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span><strong>Abonnements Fantômes</strong> (traque et notification automatique suspendues)</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span><strong>Synchronisation Cloud instantanée</strong> sur tous vos écrans inactive</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRetentionPrompt(false)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 text-xs font-bold py-2 px-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles size={11} />
                  Conserver mes avantages PRO ✨
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPremium(false);
                    setShowRetentionPrompt(false);
                  }}
                  className="w-full text-zinc-500 hover:text-red-400 text-[10px] font-bold py-1.5 px-2 hover:bg-zinc-950/40 rounded transition-all cursor-pointer text-center block border border-transparent hover:border-zinc-800"
                >
                  Je confirme ma résiliation (Offre gratuite)
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                      SmartScan Premium <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">PRO</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-medium">Maximisez votre gestion financière</p>
                  </div>
                </div>

                {/* Premium pricing callout - with shrink-0 and whitespace-nowrap to prevent Euro (€) symbol wrapping */}
                <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800 flex items-center justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-400 font-semibold block leading-tight truncate">Abonnement Mensuel</span>
                    <span className="text-[10px] text-zinc-500 font-semibold block leading-snug">Sans engagement, résiliation en ligne</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-amber-400 font-mono whitespace-nowrap text-right block">4,99 €</span>
                    <span className="text-[10px] text-zinc-400 font-medium block leading-none whitespace-nowrap">/ mois</span>
                  </div>
                </div>

                {/* Premium client-facing benefits list */}
                <div className="space-y-2 text-[11px] text-zinc-300">
                  <div className="flex items-start gap-1.5">
                    <Check size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Analyses & Scans Illimités</strong> (Analyse en temps réel de tous vos reçus)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Exportation Comptable Complète</strong> (Fichiers Excel ou CSV avec la TVA détaillée)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Abonnements Fantômes</strong> (Détection intelligente de frais récurrents cachés)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Multi-Appareils Cloud</strong> (Accès et sauvegarde sécurisés instantanés)</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {!isPremium ? (
                  <button 
                    type="button"
                    onClick={() => onSubscribeClick?.()}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-950/20 transition-all flex items-center justify-center gap-1 group active:scale-[0.98] cursor-pointer"
                  >
                    Activer l'essai Premium
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="bg-zinc-950/90 border border-emerald-500/30 rounded-xl p-3 text-center flex flex-col items-center justify-center space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <ShieldCheck size={14} />
                      <span>Mode Premium Actif (Simulé)</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowRetentionPrompt(true);
                      }}
                      className="w-full bg-zinc-900 hover:bg-zinc-855 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                    >
                      Résilier l'abonnement Premium (Terminer d'essai)
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* 4. User Gamification Tiers */}
      <div className="bg-zinc-900/60 p-5 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row items-center sm:justify-between gap-4" id="loyalty-tier-card">
        <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
          <div className={`p-3.5 rounded-full flex items-center justify-center shrink-0 ${rankColor}`}>
            <Award size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Rang de Maîtrise</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${rankColor}`}>
                {userRank}
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-semibold leading-snug">
              {rankDescription}
            </p>
          </div>
        </div>
        <div className="text-center sm:text-right shrink-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Progression de scans</div>
          <div className="text-lg font-black text-white font-mono mt-0.5">{scanCount} / 8 scannés</div>
          <p className="text-[9px] text-zinc-500 mt-0.5">Rang maximal (Champion) à 8 scans</p>
        </div>
      </div>

    </div>
  );
}
