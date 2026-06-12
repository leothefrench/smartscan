import React, { useState, useEffect } from 'react';
import { Receipt, ReceiptItem } from './types';
import StatsOverview from './components/StatsOverview';
import ReceiptScanner from './components/ReceiptScanner';
import ReceiptList from './components/ReceiptList';
import ReceiptDetailsModal from './components/ReceiptDetailsModal';
import AuthScreen from './components/AuthScreen';
import PrivacyBanner from './components/PrivacyBanner';
import YouthSavingHub from './components/YouthSavingHub';
import {
  IS_FIREBASE_REAL,
  fetchUserReceipts,
  saveUserReceiptToCloud,
  deleteUserReceiptFromCloud,
  syncLocalReceiptsToCloud,
} from './utils/firebase';
import {
  Scan,
  Sparkles,
  ReceiptText,
  ShieldCheck,
  LogOut,
  User,
  Cloud,
  CloudOff,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react';

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [customIp, setCustomIp] = useState<string>('');

  const getQrUrl = () => {
    const currentUrl = window.location.href;
    if (customIp.trim()) {
      try {
        const urlObj = new URL(currentUrl);
        let hostWithPort = customIp.trim();
        if (!hostWithPort.includes(':')) {
          if (urlObj.port) {
            hostWithPort = `${hostWithPort}:${urlObj.port}`;
          }
        }
        urlObj.host = hostWithPort;
        return urlObj.toString();
      } catch (e) {
        return currentUrl;
      }
    }
    return currentUrl;
  };

  // Initialize receipts from LocalStorage or seed with some defaults, and sync with Cloud Firestore
  useEffect(() => {
    const userSession = localStorage.getItem('scanner_user_session');
    let initialReceipts: Receipt[] = [];

    if (userSession) {
      setCurrentUserEmail(userSession);
      setIsAuthenticated(true);
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

    if (IS_FIREBASE_REAL) {
      const userId = email.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
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

          {IS_FIREBASE_REAL ? (
            <div
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-900/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
              title="Base de données Cloud active"
            >
              <Cloud size={13} className="animate-pulse text-emerald-400" />
              <span className="hidden sm:inline">Cloud Synced</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-zinc-400 font-semibold bg-zinc-900 border border-zinc-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
              title="Sauvegarde locale chiffrée. Connectez Firebase pour synchroniser."
            >
              <CloudOff size={13} className="text-zinc-500" />
              <span className="hidden sm:inline">Local Sécurisé</span>
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
            Protection des flux active
          </div>
        </div>

        {/* GDPR Privacy compliance banner */}
        <PrivacyBanner />

        {/* Bento Dashboard stats meters */}
        <StatsOverview receipts={receipts} />

        {/* Youth-centric Gamified Savings and optimization metrics */}
        <YouthSavingHub receipts={receipts} />

        {/* Scanner Uploader Module */}
        <ReceiptScanner onScanSuccess={handleScanSuccess} />

        {/* Historic lists search cards */}
        <ReceiptList
          receipts={receipts}
          onSelectReceipt={setSelectedReceipt}
          onClearDemo={handleClearDemo}
        />
      </main>

      {/* Footer information section */}
      <footer className="py-8 border-t border-zinc-900 bg-zinc-950/40 text-center text-xs text-zinc-500 space-y-1">
        <p>
          SmartScan — Application à haute intégrité et conformité RGPD
          européenne.
        </p>
        <p className="text-[10px] text-zinc-600">
          Aucune donnée n'est stockée à des fins d'entraînement ou revendue à
          des tiers.
        </p>
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

      {/* QR Code Scan on Mobile Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button
              onClick={() => setShowQrCode(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-white">
                Scanner avec votre smartphone
              </h3>
              <p className="text-[10px] text-zinc-400">
                Pour tester l'application directement sur votre Xiaomi / Redmi
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-center bg-white p-4 rounded-2xl border-4 border-zinc-950 w-fit mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    getQrUrl(),
                  )}`}
                  alt="QR Code de l'application"
                  className="w-40 h-40"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1.5 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 block tracking-tight uppercase">
                  📡 Ma machine locale (IP locale pc) :
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: 192.168.1.50"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    className="flex-1 bg-zinc-900 text-white text-xs border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {customIp && (
                    <button
                      type="button"
                      onClick={() => setCustomIp('')}
                      className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Par défaut, l'application utilise l'adresse actuelle. Si vous
                  êtes sur votre ordinateur (localhost), remplacez par votre IP
                  locale pour y accéder depuis votre portable connecté au même
                  Wi-Fi.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-zinc-300">
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  Ouvrez l'application <strong>Appareil Photo</strong> ou le
                  raccourci <strong>Scanner</strong> de votre Xiaomi.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  Visez le code QR ci-dessus avec l'objectif de votre téléphone.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  Cliquez sur le lien de redirection qui apparaît à l'écran !
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowQrCode(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
