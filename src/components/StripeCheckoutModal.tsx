import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, X, AlertCircle } from 'lucide-react';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string | null;
}

export default function StripeCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
}: StripeCheckoutModalProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [realStripeLoading, setRealStripeLoading] = useState(false);
  const [hasAcknowledgedWithdrawal, setHasAcknowledgedWithdrawal] =
    useState(false);

  if (!isOpen) return null;

  const handleRealStripeRedirect = async () => {
    if (!userEmail) {
      setErrorMsg(
        'Veuillez vous connecter pour initier la souscription Stripe.',
      );
      return;
    }
    if (!hasAcknowledgedWithdrawal) {
      setErrorMsg(
        "Vous devez accepter la renonciation au droit de rétractation pour démarrer l'accès Premium instantané.",
      );
      return;
    }
    setRealStripeLoading(true);
    setErrorMsg('');
    try {
      const userId = userEmail.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          userId: userId,
        }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Redirect to safe Stripe hosted checkout
        window.location.href = data.url;
      } else {
        throw new Error(
          data.error || 'Une erreur est survenue lors de la redirection.',
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        `Impossible de lancer le paiement réel : ${
          err.message || err
        }. Veuillez vous assurer d'avoir configuré la clé secrète STRIPE_SECRET_KEY dans vos variables d'environnement (.env).`,
      );
    } finally {
      setRealStripeLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      id="stripe-checkout-modal-container"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md flex flex-col overflow-hidden relative shadow-2xl shadow-amber-950/5">
        {/* Header Close button */}
        {!realStripeLoading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            type="button"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Banner Stripe Style */}
        <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-300 tracking-tight uppercase">
              Paiement Sécurisé Stripe
            </span>
          </div>
        </div>

        {/* Modal Main Core Container */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-5 py-2">
            <div className="text-center space-y-1 pb-2 border-b border-zinc-900/60">
              <h3 className="text-lg font-black text-white">
                SmartScan Premium PRO
              </h3>
              <p className="text-xs text-zinc-400">
                Essai gratuit de 7 jours, puis{' '}
                <span className="text-amber-400 font-extrabold font-mono text-sm">
                  4,99 €/mo.
                </span>{' '}
                sans engagement.
              </p>
            </div>

            {/* Error Callout */}
            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-1.5 font-sans animate-pulse">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Core features listing */}
            <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Avantages de votre abonnement PRO :
              </p>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    Analyses de tickets et factures en temps réel et illimitées
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Exports comptables instantanés (PDF, Excel, CSV)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    Synchronisation Cloud sécurisée sur tous vos écrans
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    Pas d'engagement, annulation en un clic depuis les
                    paramètres
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Waiver Consent Checkbox */}
            <div
              className={`p-4 rounded-2xl transition-all duration-200 border space-y-3 ${
                hasAcknowledgedWithdrawal
                  ? 'bg-zinc-900/80 border-emerald-500/30 shadow-md shadow-emerald-950/10'
                  : 'bg-amber-950/20 border-amber-500/30 shadow-md'
              }`}
            >
              <label
                className="flex items-start gap-3.5 cursor-pointer group select-none"
                htmlFor="waiver-consent-checkbox"
              >
                <div className="relative flex items-center shrink-0 mt-0.5">
                  <input
                    id="waiver-consent-checkbox"
                    type="checkbox"
                    checked={hasAcknowledgedWithdrawal}
                    onChange={(e) => {
                      setHasAcknowledgedWithdrawal(e.target.checked);
                      setErrorMsg('');
                    }}
                    required
                    aria-required="true"
                    aria-checked={hasAcknowledgedWithdrawal}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/40 focus:ring-offset-0 focus:ring-2 accent-amber-500 cursor-pointer transition-all shrink-0"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-white tracking-wide uppercase flex items-center gap-1">
                    {!hasAcknowledgedWithdrawal && (
                      <span className="text-amber-400 animate-pulse">
                        ⚠️ Action requise :
                      </span>
                    )}
                    <span className="text-zinc-100">
                      Consentement obligatoire
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-100 font-medium leading-relaxed block group-hover:text-white transition-colors">
                    J’autorise expressément l’exécution immédiate du service
                    Premium PRO dès la souscription et je{' '}
                    <strong className="text-amber-300 font-extrabold underline underline-offset-1 decoration-amber-400/50">
                      renonce expressément à mon droit de rétractation de 14
                      jours
                    </strong>{' '}
                    (Art. L221-28 13° du Code de la consommation) pour
                    bénéficier instantanément de l’OCR intelligent et des
                    exports.
                  </span>
                </div>
              </label>
            </div>

            {/* Secure Payment Button */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleRealStripeRedirect}
                disabled={realStripeLoading || !hasAcknowledgedWithdrawal}
                className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-zinc-805 disabled:to-zinc-805 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-950/20 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20"
              >
                {realStripeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <ShieldCheck size={15} className="text-zinc-950 shrink-0" />
                )}
                {realStripeLoading
                  ? 'Initialisation Stripe...'
                  : 'Payer via Page Sécurisée Stripe'}
              </button>
              <p className="text-[10px] text-zinc-500 text-center leading-normal">
                Redirection 100% sécurisée vers Stripe pour finaliser votre
                abonnement (compatible Cartes Bancaires, Google Pay, Apple Pay).
              </p>
            </div>

            <div className="text-[9px] text-zinc-600 text-center leading-normal">
              En initiant cet essai, vous acceptez d'activer un paiement
              récurrent d'un montant de 4,99 €/mois après 7 jours si vous ne
              résiliez pas d'ici là. Résiliation possible d'un clic depuis vos
              paramètres.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
