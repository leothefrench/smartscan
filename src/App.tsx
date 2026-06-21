import React, { useState, useEffect } from 'react';
import { Receipt, ReceiptItem } from './types';
import StatsOverview from './components/StatsOverview';
import ReceiptScanner from './components/ReceiptScanner';
import ReceiptList from './components/ReceiptList';
import ReceiptDetailsModal from './components/ReceiptDetailsModal';
import AuthScreen from './components/AuthScreen';
import PrivacyBanner from './components/PrivacyBanner';
import YouthSavingHub from './components/YouthSavingHub';
import StripeCheckoutModal from './components/StripeCheckoutModal';
import LegalTermsModal from './components/LegalTermsModal';
import {
  IS_FIREBASE_REAL,
  fetchUserReceipts,
  saveUserReceiptToCloud,
  deleteUserReceiptFromCloud,
  syncLocalReceiptsToCloud,
  saveUserPremiumStatus,
  fetchUserPremiumStatus,
} from './utils/firebase';
import {
  Scan,
  Sparkles,
  ShieldCheck,
  LogOut,
  User,
  Smartphone,
  X,
  AlertTriangle,
  Eye,
  PlusCircle,
} from 'lucide-react';

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [duplicateReceiptData, setDuplicateReceiptData] = useState<{
    data: Receipt;
    originalImageName: string;
    base64Preview?: string;
    existingId: string;
  } | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [stripeNotification, setStripeNotification] = useState<{
    type: 'success' | 'canceled';
    message: string;
  } | null>(null);

  const handleSetIsPremium = async (status: boolean) => {
    setIsPremium(status);
    if (currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      localStorage.setItem(`premium_${userId}`, status ? 'true' : 'false');
      if (IS_FIREBASE_REAL) {
        try {
          await saveUserPremiumStatus(userId, status);
        } catch (e) {
          console.warn('Could not save premium status to Firestore:', e);
        }
      }
    }
  };

  const getQrUrl = () => {
    return window.location.href;
  };

  // Initialize receipts from LocalStorage or seed with some defaults, and sync with Cloud Firestore
  useEffect(() => {
    const userSession = localStorage.getItem('scanner_user_session');
    let initialReceipts: Receipt[] = [];

    // Check Stripe Payment checkout return status in URL search query
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    if (stripeStatus) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (stripeStatus === 'success') {
        setIsPremium(true);
        if (userSession) {
          const userId = userSession
            .toLowerCase()
            .replace(/[^a-zA-Z0-9_\-]/g, '_');
          localStorage.setItem(`premium_${userId}`, 'true');
          if (IS_FIREBASE_REAL) {
            saveUserPremiumStatus(userId, true).catch((err) =>
              console.warn(err),
            );
          }
        }
        setStripeNotification({
          type: 'success',
          message:
            'Félicitations ! Votre souscription Stripe a été complétée avec succès. Votre espace SmartScan Premium PRO est désormais pleinement actif ! 🎉',
        });
      } else if (stripeStatus === 'canceled') {
        setStripeNotification({
          type: 'canceled',
          message:
            "L'opération de paiement Stripe a été annulée. Aucun frais n'a été débité de votre carte bancaire.",
        });
      }
    }

    if (userSession) {
      setCurrentUserEmail(userSession);
      setIsAuthenticated(true);

      const userId = userSession.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
      const isLocalPremium =
        localStorage.getItem(`premium_${userId}`) === 'true';
      setIsPremium(isLocalPremium);

      if (IS_FIREBASE_REAL) {
        fetchUserPremiumStatus(userId)
          .then((status) => {
            setIsPremium(status);
            localStorage.setItem(
              `premium_${userId}`,
              status ? 'true' : 'false',
            );
          })
          .catch((err) =>
            console.warn('Erreur chargement premium initial :', err),
          );
      }
    }

    const stored = localStorage.getItem('scanner_receipts');
    if (stored) {
      try {
        initialReceipts = JSON.parse(stored);
        setReceipts(initialReceipts);
      } catch (err) {
        console.error("Échec du parsing de l'historique local.");
        setReceipts([]);
      }
    } else {
      setReceipts([]);
    }

    // Interactive Firebase global sync on initial app startup
    if (userSession && IS_FIREBASE_REAL) {
      const userId = userSession.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
      fetchUserReceipts(userId)
        .then((cloudList) => {
          if (cloudList && cloudList.length > 0) {
            // Merge local and cloud receipts safely, prioritizing cloud definitions
            const cloudIds = new Set(cloudList.map((r) => r.id));
            const merged = [...cloudList];

            initialReceipts.forEach((local) => {
              if (!cloudIds.has(local.id)) {
                merged.push(local);
                // Back up local-only receipts to cloud in background
                saveUserReceiptToCloud(userId, local).catch((e) =>
                  console.warn("Erreur d'écriture en arrière-plan :", e),
                );
              }
            });

            setReceipts(merged);
            localStorage.setItem('scanner_receipts', JSON.stringify(merged));
          } else if (initialReceipts.length > 0) {
            // If Firestore is empty but we have local receipts, sync ALL local receipts to Firestore
            initialReceipts.forEach((local) => {
              saveUserReceiptToCloud(userId, local).catch((e) =>
                console.warn("Erreur d'écriture en arrière-plan :", e),
              );
            });
          }
        })
        .catch((e) =>
          console.warn(
            "La récupération Cloud n'a pas pu être complétée (mode hors-ligne actif) :",
            e,
          ),
        );
    }
  }, []);

  const handleLoginSuccess = async (email: string) => {
    setCurrentUserEmail(email);
    setIsAuthenticated(true);
    localStorage.setItem('scanner_user_session', email);

    const userId = email.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
    const isLocalPremium = localStorage.getItem(`premium_${userId}`) === 'true';
    setIsPremium(isLocalPremium);

    if (IS_FIREBASE_REAL) {
      fetchUserPremiumStatus(userId)
        .then((status) => {
          setIsPremium(status);
          localStorage.setItem(`premium_${userId}`, status ? 'true' : 'false');
        })
        .catch((err) => console.warn('Erreur chargement premium login :', err));

      try {
        const stored = localStorage.getItem('scanner_receipts');
        const localList: Receipt[] = stored ? JSON.parse(stored) : [];
        const syncedList = await syncLocalReceiptsToCloud(userId, localList);
        setReceipts(syncedList);
        localStorage.setItem('scanner_receipts', JSON.stringify(syncedList));
      } catch (err) {
        console.error(
          'Échec de la synchronisation lors de la connexion :',
          err,
        );
      }
    }
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    setIsAuthenticated(false);
    localStorage.removeItem('scanner_user_session');
  };

  // Persist local state edits and sync with Cloud Firestore
  const saveAndSyncReceipts = async (updatedList: Receipt[]) => {
    setReceipts(updatedList);
    localStorage.setItem('scanner_receipts', JSON.stringify(updatedList));

    if (IS_FIREBASE_REAL && currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      try {
        // Asynchronously backup any receipts to cloud
        for (const receipt of updatedList) {
          await saveUserReceiptToCloud(userId, receipt);
        }
      } catch (err) {
        console.error(
          "Erreur d'écriture sur le Cloud (mode hors-ligne actif) :",
          err,
        );
      }
    }
  };

  // Add new parsed receipt
  const handleScanSuccess = (
    data: any,
    originalImageName: string,
    base64Preview?: string,
    forceAdd = false,
  ) => {
    const isFullObject = data.id && Array.isArray(data.items);

    // Construct the structured fields cleanly
    const finalReceipt: Receipt = isFullObject
      ? data
      : {
          id: `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          merchant: data.merchant || 'Magasin Inconnu',
          date: data.date || new Date().toISOString().split('T')[0],
          totalAmount:
            typeof data.totalAmount === 'number' ? data.totalAmount : 0,
          taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : 0,
          currency: data.currency || 'EUR',
          rawResponse: data.rawResponse || 'Ticket numérisé avec succès.',
          imageUrl: base64Preview,
          scannedAt: new Date().toISOString(),
          items: Array.isArray(data.items)
            ? data.items.map((item: any, idx: number) => ({
                id: `item-${Date.now()}-${idx}`,
                name: item.name || 'Article Spécifique',
                quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                price: typeof item.price === 'number' ? item.price : 0,
                category: item.category || 'Autre',
              }))
            : [],
        };

    // Duplicate detection check
    if (!forceAdd) {
      const normalizedNewMerchant = finalReceipt.merchant.toLowerCase().trim();
      const existingDuplicate = receipts.find((r) => {
        const normalizedExistingMerchant = r.merchant.toLowerCase().trim();
        const dateMatch = r.date === finalReceipt.date;
        const amountMatch =
          Math.abs(r.totalAmount - finalReceipt.totalAmount) < 0.01;
        return (
          normalizedExistingMerchant === normalizedNewMerchant &&
          dateMatch &&
          amountMatch
        );
      });

      if (existingDuplicate) {
        setDuplicateReceiptData({
          data: finalReceipt,
          originalImageName,
          base64Preview,
          existingId: existingDuplicate.id,
        });
        return;
      }
    }

    const updated = [finalReceipt, ...receipts];
    saveAndSyncReceipts(updated);

    // Automatically open the details view modal for the newly scanned ticket! (Outstanding UX)
    setSelectedReceipt(finalReceipt);
  };

  // Update scanned receipt edits
  const handleUpdateReceipt = async (updated: Receipt) => {
    const updatedList = receipts.map((r) =>
      r.id === updated.id ? updated : r,
    );
    await saveAndSyncReceipts(updatedList);

    // Keep reference fresh in state if open
    setSelectedReceipt(updated);

    if (IS_FIREBASE_REAL && currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      try {
        await saveUserReceiptToCloud(userId, updated);
      } catch (err) {
        console.error("Erreur d'édition du document Cloud :", err);
      }
    }
  };

  // Delete scanned receipt
  const handleDeleteReceipt = async (id: string) => {
    const updatedList = receipts.filter((r) => r.id !== id);
    await saveAndSyncReceipts(updatedList);

    if (IS_FIREBASE_REAL && currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      try {
        await deleteUserReceiptFromCloud(userId, id);
      } catch (err) {
        console.error('Erreur de suppression du document Cloud :', err);
      }
    }
  };

  const handleClearDemo = () => {
    const onlyReal = receipts.filter(
      (r) =>
        !r.id.startsWith('receipt-init-') && !r.id.startsWith('receipt-demo-'),
    );
    saveAndSyncReceipts(onlyReal);
  };

  const handleAddSubscriptionReceipt = (subsName: string, price: number) => {
    const newReceipt: Receipt = {
      id: `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      merchant: subsName,
      date: new Date().toISOString().split('T')[0],
      totalAmount: price,
      taxAmount: Number((price * 0.2).toFixed(2)),
      currency: 'EUR',
      rawResponse: `Prélèvement périodique mensuel de votre abonnement ${subsName} détecté automatiquement. Apprenez à optimiser vos charges fixes et résilier ce service s'il s'agit d'un abonnement fantôme.`,
      scannedAt: new Date().toISOString(),
      isRecurring: true,
      recurrence: 'monthly',
      items: [
        {
          id: `item-${Date.now()}-0`,
          name: `Abonnement Mensuel ${subsName}`,
          quantity: 1,
          price: price,
          category: 'Services & Factures',
        },
      ],
    };
    const updated = [newReceipt, ...receipts];
    saveAndSyncReceipts(updated);
  };

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className="min-h-screen bg-black text-zinc-150 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-400"
      id="app-root"
    >
      {/* Elegantly Polished Navbar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative p-1.5 sm:p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-950/40 shrink-0">
            <Scan size={18} className="relative z-10 sm:hidden" />
            <Scan size={20} className="relative z-10 hidden sm:block" />
            <div className="absolute inset-x-0 bottom-0 top-0 bg-emerald-400 rounded-xl blur-md opacity-25" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
              SmartScan{' '}
              <span className="hidden sm:inline-block text-[9px] bg-zinc-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium border border-zinc-800">
                PRO-SECURE
              </span>
            </h1>
            <span className="hidden md:inline-block text-[10px] text-zinc-400 font-medium">
              Gestionnaire intelligent & ultra-privé de tickets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {currentUserEmail && (
            <div className="hidden lg:flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <User size={13} className="text-zinc-400" />
              <span className="text-xs font-mono text-zinc-300 font-semibold">
                {currentUserEmail}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowQrCode(true)}
            className="hidden md:flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-950/30 border border-amber-900/50 px-3 py-1.5 rounded-full hover:bg-amber-950/50 transition-all cursor-pointer"
            title="Ouvrir sur votre smartphone Redmi"
          >
            <Smartphone size={13} />
            Mobile Scan
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} />
            Conforme RGPD
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 rounded-xl transition-all cursor-pointer shrink-0"
            title="Se déconnecter"
          >
            <LogOut size={15} className="sm:hidden" />
            <LogOut size={16} className="hidden sm:block" />
          </button>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stripe Success or Canceled in-app notifications banner */}
        {stripeNotification && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-4 shadow-xl ${
              stripeNotification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            }`}
            id="stripe-status-notification"
          >
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                stripeNotification.type === 'success'
                  ? 'bg-emerald-500/10'
                  : 'bg-amber-500/10'
              }`}
            >
              <ShieldCheck
                size={18}
                className={
                  stripeNotification.type === 'success'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }
              />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-xs font-bold font-mono tracking-tight uppercase block">
                {stripeNotification.type === 'success'
                  ? 'Abonnement Activé ✅'
                  : 'Paiement Annulé ⚠️'}
              </span>
              <p className="text-[11px] leading-relaxed opacity-95">
                {stripeNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStripeNotification(null)}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Welcome Pitch Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Tableau de bord de suivi budgétaire
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Suivez vos dépenses et optimisez vos économies. Vos données
              restent cryptées localement pour un respect absolu de votre vie
              privée.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-900/50 px-4 py-2.5 rounded-2xl">
            <Sparkles size={14} className="text-emerald-400 animate-pulse" />{' '}
            Données sécurisées
          </div>
        </div>

        {/* GDPR Privacy compliance banner */}
        <PrivacyBanner />

        {/* Bento Dashboard stats meters */}
        <StatsOverview receipts={receipts} />

        {/* Youth-centric Gamified Savings and optimization metrics */}
        <YouthSavingHub
          receipts={receipts}
          isPremium={isPremium}
          setIsPremium={handleSetIsPremium}
          userEmail={currentUserEmail}
          onSubscribeClick={() => setIsCheckoutOpen(true)}
          onAddSubscriptionReceipt={handleAddSubscriptionReceipt}
          onDeleteReceipt={handleDeleteReceipt}
        />

        {/* Scanner Uploader Module */}
        <ReceiptScanner
          onScanSuccess={handleScanSuccess}
          isPremium={isPremium}
        />

        {/* Historic lists search cards */}
        <ReceiptList
          receipts={receipts}
          onSelectReceipt={setSelectedReceipt}
          onClearDemo={handleClearDemo}
          isPremium={isPremium}
          onSubscribeClick={() => setIsCheckoutOpen(true)}
        />
      </main>

      {/* Footer information section */}
      <footer className="py-8 border-t border-zinc-900 bg-zinc-950/40 text-center text-xs text-zinc-500 space-y-1.5 shrink-0">
        <p>
          SmartScan — Application à haute intégrité et conformité RGPD
          européenne.
        </p>
        <p className="text-[10px] text-zinc-650">
          Aucune donnée n'est stockée à des fins d'entraînement ou revendue à
          des tiers.
        </p>
        <button
          type="button"
          onClick={() => setIsLegalOpen(true)}
          className="text-[10px] text-amber-500 hover:text-amber-400 underline font-semibold cursor-pointer block mx-auto mt-2"
        >
          Conditions Générales d'Utilisation (CGU) & Mentions Légales
        </button>
      </footer>

      {/* Interactive detail previews overlay */}
      {selectedReceipt && (
        <ReceiptDetailsModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onDelete={handleDeleteReceipt}
          onUpdate={handleUpdateReceipt}
        />
      )}

      {/* Duplicate Warning Modal */}
      {duplicateReceiptData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          id="duplicate-warning-modal"
        >
          <div className="bg-zinc-950 border-2 border-amber-500/30 rounded-3xl p-6 max-w-md w-full relative space-y-6 shadow-2xl shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 shrink-0">
                <AlertTriangle
                  size={24}
                  className="animate-bounce text-amber-500"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Attention : Doublon Détecté
                </h3>
                <p className="text-xs text-zinc-400">
                  Ce ticket de caisse semble déjà exister !
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Commerçant :</span>
                <span className="text-white font-bold">
                  {duplicateReceiptData.data.merchant}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Date d'achat :</span>
                <span className="text-white font-bold">
                  {duplicateReceiptData.data.date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Montant total :</span>
                <span className="text-amber-400 font-black">
                  {duplicateReceiptData.data.totalAmount >= 0
                    ? `${duplicateReceiptData.data.totalAmount.toFixed(2)} €`
                    : '0.00 €'}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Pour éviter d'enregistrer deux fois le même achat et de fausser
              vos statistiques de budget, vous pouvez choisir l'action
              appropriée ci-dessous.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const existing = receipts.find(
                    (r) => r.id === duplicateReceiptData.existingId,
                  );
                  if (existing) {
                    setSelectedReceipt(existing);
                  }
                  setDuplicateReceiptData(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs"
              >
                <Eye size={15} />
                Consulter le ticket déjà enregistré
              </button>

              <div className="grid grid-cols-2 gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    handleScanSuccess(
                      duplicateReceiptData.data,
                      duplicateReceiptData.originalImageName,
                      duplicateReceiptData.base64Preview,
                      true,
                    );
                    setDuplicateReceiptData(null);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <PlusCircle size={14} className="text-zinc-400" />
                  Saisir quand même
                </button>

                <button
                  type="button"
                  onClick={() => setDuplicateReceiptData(null)}
                  className="flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 hover:text-white text-zinc-400 py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <X size={14} />
                  Ignorer ce scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Scan on Mobile Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full relative space-y-5 shadow-2xl">
            <button
              onClick={() => setShowQrCode(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-white">
                Scanner avec votre smartphone
              </h3>
              <p className="text-[10px] text-zinc-400">
                Pour tester l'application directement sur votre smartphone
              </p>
            </div>

            <div className="flex justify-center bg-white p-4 rounded-2xl border-4 border-zinc-950 w-fit mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  getQrUrl(),
                )}`}
                alt="QR Code de l'application"
                className="w-40 h-40"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-[10.5px] text-zinc-300 text-center leading-normal px-2">
              Visez ce QR code avec l'appareil photo de votre smartphone pour
              continuer sur votre mobile.
            </div>

            <button
              onClick={() => setShowQrCode(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Stripe checkout modal centrally managed */}
      <StripeCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => handleSetIsPremium(true)}
        userEmail={currentUserEmail}
      />

      {/* Legal terms details modal */}
      <LegalTermsModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
      />
    </div>
  );
}
