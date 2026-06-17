import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';

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
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [paymentStep, setPaymentStep] = useState<
    'form' | 'loading' | 'tds' | 'success'
  >('form');
  const [loadingText, setLoadingText] = useState('');
  const [tdsCode, setTdsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  // Auto-fill user name based on email
  useEffect(() => {
    if (userEmail && isOpen) {
      const parts = userEmail.split('@')[0];
      const cleanName = parts
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      setName(cleanName);

      // Reset state when opening
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setPostalCode('');
      setErrorMsg('');
      setPaymentStep('form');
      setSmsSent(false);
      setTdsCode('');
    }
  }, [userEmail, isOpen]);

  if (!isOpen) return null;

  // Formatting helper for Card Number: xxxx xxxx xxxx xxxx
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Formatting helper for Expiry: MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    if (value.length > 2) {
      setExpiry(`${value.substring(0, 2)}/${value.substring(2)}`);
    } else {
      setExpiry(value);
    }
  };

  // Only numbers for CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCvc(value);
    }
  };

  // Identify card brand
  const getCardBrand = () => {
    const rawNum = cardNumber.replace(/\s/g, '');
    if (rawNum.startsWith('4')) return 'Visa';
    if (rawNum.startsWith('5')) return 'Mastercard';
    if (rawNum.startsWith('3')) return 'Amex';
    return 'Generic';
  };

  const validateForm = () => {
    const rawCard = cardNumber.replace(/\s/g, '');
    if (rawCard.length < 16) {
      setErrorMsg(
        'Veuillez saisir un numéro de carte bancaire valide à 16 chiffres.',
      );
      return false;
    }

    const expiryParts = expiry.split('/');
    if (
      expiryParts.length !== 2 ||
      expiryParts[0].length !== 2 ||
      expiryParts[1].length !== 2
    ) {
      setErrorMsg("La date d'expiration doit être au format MM/AA.");
      return false;
    }

    const month = parseInt(expiryParts[0], 10);
    if (month < 1 || month > 12) {
      setErrorMsg("Le mois de la date d'expiration est invalide (01 à 12).");
      return false;
    }

    if (cvc.length < 3) {
      setErrorMsg('Veuillez saisir un code de sécurité CVC valide.');
      return false;
    }

    if (!name.trim()) {
      setErrorMsg('Le nom complet du titulaire est requis.');
      return false;
    }

    return true;
  };

  const handleLaunchPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) return;

    // Phase 1 : Stripe Loading Simulation
    setPaymentStep('loading');
    setLoadingText('Création de la session de paiement sécurisée Stripe...');

    setTimeout(() => {
      setLoadingText('Vérification anti-fraude & conformité bancaire...');
      setTimeout(() => {
        setLoadingText(
          'Demande de validation forte (3D Secure) requise par votre banque...',
        );
        setTimeout(() => {
          setPaymentStep('tds');
          setSmsSent(true);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const handleVerify3DS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tdsCode.trim()) {
      setErrorMsg('Veuillez entrer le code de sécurité reçu.');
      return;
    }

    setPaymentStep('loading');
    setLoadingText(
      "Validation de l'autorisation de prélèvement SmartScan SAS...",
    );

    setTimeout(() => {
      setPaymentStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    }, 1800);
  };

  const handleAutoFillTestCard = () => {
    // Fill Stripe test card (4242 4242...)
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/29');
    setCvc('420');
    setPostalCode('75001');
    setErrorMsg('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      id="stripe-checkout-modal-container"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl shadow-amber-950/5">
        {/* Header Close button */}
        {paymentStep !== 'loading' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            type="button"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Banner Stripe Style */}
        <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-300 font-mono tracking-tight uppercase">
              Paiement Sécurisé Stripe
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Lock size={10} className="text-zinc-500" />
            <span>Chiffrement SSL 256-bits</span>
          </div>
        </div>

        {/* Modal Main Core Container */}
        <div className="p-6">
          {/* STEP 1: Form Fill */}
          {paymentStep === 'form' && (
            <form onSubmit={handleLaunchPayment} className="space-y-4">
              <div className="text-center space-y-1 pb-2">
                <h3 className="text-base font-extrabold text-white">
                  SmartScan Premium PRO
                </h3>
                <p className="text-xs text-zinc-400">
                  Essai gratuit de 14 jours, puis{' '}
                  <span className="text-amber-400 font-bold font-mono">
                    4,99 €/mo.
                  </span>{' '}
                  sans engagement.
                </p>
              </div>

              {/* Stripe Test Creds Quick Fill Banner */}
              <div className="bg-amber-500/5 rounded-2xl p-2.5 border border-amber-500/10 flex items-center justify-between gap-2">
                <div className="text-[10px] text-zinc-400">
                  <span className="font-semibold text-amber-500 block">
                    💡 Mode Test Intégré
                  </span>
                  Remplir les champs avec les cartes de test Stripe
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillTestCard}
                  className="px-2 py-1 text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 rounded border border-amber-500/20 transition-all cursor-pointer"
                >
                  Remplir Auto
                </button>
              </div>

              {/* Error Callout */}
              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-1.5 font-sans">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    value={userEmail || ''}
                    disabled
                    className="w-full bg-zinc-900 border border-zinc-900 text-zinc-400 text-xs rounded-xl px-3 py-2.5 outline-none font-mono cursor-not-allowed opacity-80"
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block flex justify-between items-center">
                    <span>Numéro de carte</span>
                    <span className="text-[9px] text-amber-500 font-mono font-medium">
                      {getCardBrand()}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none font-mono transition-colors"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <CreditCard size={15} />
                    </div>
                  </div>
                </div>

                {/* Grid Expiry & CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Expiration (MM/AA)
                    </label>
                    <input
                      type="text"
                      placeholder="12/29"
                      value={expiry}
                      onChange={handleExpiryChange}
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl px-3 py-2.5 text-center outline-none font-mono transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      CVC / Cryptogramme
                    </label>
                    <input
                      type="password"
                      placeholder="123"
                      value={cvc}
                      onChange={handleCvcChange}
                      required
                      maxLength={4}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl px-3 py-2.5 text-center outline-none font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Name on card */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Nom sur la carte
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Léo Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl px-3 py-2.5 outline-none transition-colors"
                  />
                </div>

                {/* Postal Code & Country */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Code Postal
                    </label>
                    <input
                      type="text"
                      placeholder="75001"
                      value={postalCode}
                      onChange={(e) =>
                        setPostalCode(e.target.value.substring(0, 8))
                      }
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl px-3 py-2.5 text-center outline-none font-mono transition-colors"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Pays
                    </label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer">
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit CTA Trial Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-950/20 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <ShieldCheck size={14} />
                Lancer l'essai gratuit de 14 jours
              </button>

              <div className="text-[9px] text-zinc-500 text-center leading-normal">
                En initiant cet essai, vous acceptez d'activer un paiement
                récurrent de 4,99 €/mois après 14 jours si vous ne résiliez pas
                d'ici là. Prélèvement annulé instantanément d'un clic depuis
                votre compte.
              </div>
            </form>
          )}

          {/* STEP 2: Loading Status with progress spinner */}
          {paymentStep === 'loading' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center select-none animate-pulse">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <div className="space-y-2 max-w-xs">
                <p className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                  Traitement en cours
                </p>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  {loadingText}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: 3D Secure Verification Simulation screen */}
          {paymentStep === 'tds' && (
            <form onSubmit={handleVerify3DS} className="space-y-4 py-2">
              <div className="text-center space-y-2 pb-2 border-b border-zinc-900">
                <span className="inline-block p-2 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-1">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="text-sm font-black text-white">
                  Validation 3D Secure Réussie
                </h3>
                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-normal">
                  Pour des raisons de conformité européenne DSP2, votre banque
                  de carte{' '}
                  <strong className="text-zinc-200">Stripe Test</strong> demande
                  confirmation de votre identité.
                </p>
              </div>

              {/* Send Confirmation Callout */}
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs space-y-2">
                <p className="text-zinc-400 text-center text-[11px]">
                  Un code de confirmation test a été envoyé au{' '}
                  <strong className="text-white">+33 6 •• •• •• 42</strong>
                </p>
                <div className="flex gap-2 justify-center max-w-xs mx-auto pt-1">
                  <input
                    type="text"
                    value={tdsCode}
                    onChange={(e) => setTdsCode(e.target.value.slice(0, 8))}
                    placeholder="Saisissez un code (ex: 1234)"
                    className="bg-zinc-950 border border-zinc-800 text-white font-bold font-mono tracking-widest text-center text-sm rounded-xl px-3 py-2 w-full focus:border-amber-500 outline-none"
                    maxLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTdsCode('1234')}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-[10px] select-none cursor-pointer text-center"
                  >
                    Auto-saisir
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  Valider l'authentification forte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Fast skip bypass for perfect dev UX
                    setPaymentStep('loading');
                    setLoadingText(
                      'Autorisation approuvée ! Finalisation de votre abonnement...',
                    );
                    setTimeout(() => {
                      setPaymentStep('success');
                      setTimeout(() => {
                        onSuccess();
                        onClose();
                      }, 2500);
                    }, 1800);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-400 underline py-1 text-center"
                >
                  Simuler une validation instantanée sans code
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success confirmation frame */}
          {paymentStep === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center select-none">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/20">
                <CheckCircle2
                  size={32}
                  className="text-emerald-400 animate-bounce"
                />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-white">
                  Félicitations ! 🎉
                </h4>
                <p className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                  Abonnement PRO Activé avec succès
                </p>
                <p className="text-[11px] text-zinc-400 max-w-xs leading-normal">
                  Votre espace a été migré. Vous disposez désormais d'analyses
                  de reçus illimitées, d'exports comptables et du scanner en
                  temps réel !
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
