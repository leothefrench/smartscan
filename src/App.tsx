import React, { useState, useEffect } from 'react';
import { Receipt, StatSummary, ReceiptCategory } from './types';
import {
  fetchUserReceipts,
  fetchUserPremiumStatus,
  syncLocalReceiptsToCloud,
  deleteReceiptFromCloud,
  saveReceiptToCloud,
} from './utils/firebase';
import AuthScreen from './components/AuthScreen';
import ReceiptScanner from './components/ReceiptScanner';
import DashboardStats from './components/DashboardStats';
import FilterBar from './components/FilterBar';
import ReceiptList from './components/ReceiptList';
import ReceiptDetailModal from './components/ReceiptDetailModal';
import StripeCheckoutModal from './components/StripeCheckoutModal';
import ChallengeCard from './components/ChallengeCard';
import ExportButton from './components/ExportButton';
import {
  Sparkles,
  LogOut,
  Wallet,
  Share2,
  QrCode,
  Check,
  Copy,
  X,
  Wifi,
  AlertTriangle,
} from 'lucide-react';

const IS_FIREBASE_REAL = true;

export default function App() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean | null>(
    null,
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  // Modals and screens
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isStripeOpen, setIsStripeOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'year'>('all');

  // Load active session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('auth_email');
    if (saved) {
      setCurrentUserEmail(saved.trim().toLowerCase());
    }

    const cachedReceipts = localStorage.getItem('scanner_receipts');
    if (cachedReceipts) {
      try {
        setReceipts(JSON.parse(cachedReceipts));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSyncData = async (silent = false) => {
    if (!currentUserEmail || !IS_FIREBASE_REAL) return;
    const userId = currentUserEmail
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');
    try {
      // Optimistically set to true immediately to keep UI green, zero lag!
      if (!silent) {
        setFirestoreConnected(true);
      }

      const stored = localStorage.getItem('scanner_receipts');
      const localList: Receipt[] = stored ? JSON.parse(stored) : [];

      // Run both network queries in parallel to cut loading time in half!
      const [status, synced] = await Promise.all([
        fetchUserPremiumStatus(userId),
        syncLocalReceiptsToCloud(userId, localList),
      ]);

      setIsPremium(status);
      localStorage.setItem(`premium_${userId}`, status ? 'true' : 'false');

      // Mark all receipts returned from API bulk sync as synced
      const markedSynced = synced.map((r) => ({ ...r, synced: true }));
      setReceipts(markedSynced);
      localStorage.setItem('scanner_receipts', JSON.stringify(markedSynced));

      setSyncError(null);
    } catch (err: any) {
      console.warn(
        '[SmartReceipt REST Sync Warning] Échec de la synchronisation REST:',
        err,
      );
      if (!silent) {
        setSyncError(err?.message || String(err));
        setFirestoreConnected(false);
      }
    }
  };

  useEffect(() => {
    if (!currentUserEmail) {
      setFirestoreConnected(null);
      setIsPremium(false);
      return;
    }

    // Set optimistic true immediately on mount/login to make user interface lightning fast (0.0 seconds wait!)
    setFirestoreConnected(true);

    const userId = currentUserEmail
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');

    // Perform initial fast HTTP Sync instantly on load (supported even if client SDK fails)
    setLoadingSync(true);
    handleSyncData(false).finally(() => {
      setLoadingSync(false);
    });

    // Check query string parameters for stripe payment success redirection
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_status') === 'success') {
      setIsPremium(true);
      localStorage.setItem(`premium_${userId}`, 'true');
      // Clean query string from browser bar nicely
      window.history.replaceState({}, document.title, '/');
    }
  }, [currentUserEmail]);

  const handleLogin = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setCurrentUserEmail(cleanEmail);
    localStorage.setItem('auth_email', cleanEmail);
    const userId = cleanEmail.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const localPrem = localStorage.getItem(`premium_${userId}`) === 'true';
    setIsPremium(localPrem);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_email');
    localStorage.removeItem('scanner_receipts');
    setCurrentUserEmail(null);
    setReceipts([]);
    setIsPremium(false);
    setFirestoreConnected(null);
    setSyncError(null);
  };

  const handleScanSuccess = async (
    scannedData: any,
    originalName: string,
    base64Preview?: string,
  ) => {
    let finalReceipt: Receipt;

    if (scannedData.id && scannedData.items) {
      // It's a manual entry (complete format received)
      finalReceipt = scannedData;
    } else {
      // It's an AI Scan (JSON format received)
      const scannedItems = (scannedData.items || []).map(
        (item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          name: item.name || 'Article sans nom',
          quantity: item.quantity || 1,
          price: item.price || 0,
          category: (item.category || 'Autre') as ReceiptCategory,
        }),
      );

      finalReceipt = {
        id: `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        merchant: scannedData.merchant || 'Magasin Inconnu',
        date: scannedData.date || new Date().toISOString().split('T')[0],
        totalAmount: scannedData.totalAmount || 0,
        taxAmount: scannedData.taxAmount || 0,
        currency: scannedData.currency || 'EUR',
        items: scannedItems,
        rawResponse: scannedData.rawResponse || '',
        scannedAt: new Date().toISOString(),
        imageUrl: base64Preview, // Save compressed base64 preview inside indexDB
      };
    }

    const updated = [finalReceipt, ...receipts];
    setReceipts(updated);
    localStorage.setItem('scanner_receipts', JSON.stringify(updated));

    // Upload to Firebase Firestore REST backend in background if logged in
    if (currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      try {
        await saveReceiptToCloud(userId, finalReceipt);
        // Mark as synced
        const marked = updated.map((r) =>
          r.id === finalReceipt.id ? { ...r, synced: true } : r,
        );
        setReceipts(marked);
        localStorage.setItem('scanner_receipts', JSON.stringify(marked));
      } catch (err) {
        console.warn('[Firestore Upload Failed] Cached locally:', err);
      }
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    const updated = receipts.filter((r) => r.id !== id);
    setReceipts(updated);
    localStorage.setItem('scanner_receipts', JSON.stringify(updated));
    if (selectedReceipt?.id === id) {
      setSelectedReceipt(null);
    }

    if (currentUserEmail) {
      const userId = currentUserEmail
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      try {
        await deleteReceiptFromCloud(userId, id);
      } catch (err) {
        console.warn(
          '[Firestore Delete Failed] Will sync on next launch:',
          err,
        );
      }
    }
  };

  // Compute clean, high fidelity dashboard statistics
  const getStats = (): StatSummary => {
    const filtered = getFilteredReceipts();
    const total = filtered.reduce((acc, r) => acc + r.totalAmount, 0);
    const taxes = filtered.reduce((acc, r) => acc + r.taxAmount, 0);

    const categoryBreakdown: Record<ReceiptCategory, number> = {
      Alimentation: 0,
      'Loisirs & Culture': 0,
      'Santé & Hygiène': 0,
      'Mode & Habillement': 0,
      'Électronique & Maison': 0,
      'Transport & Carburant': 0,
      'Services & Factures': 0,
      Autre: 0,
    };

    filtered.forEach((r) => {
      r.items.forEach((item) => {
        const cat = (item.category || 'Autre') as ReceiptCategory;
        if (categoryBreakdown[cat] !== undefined) {
          categoryBreakdown[cat] += item.price;
        } else {
          categoryBreakdown['Autre'] += item.price;
        }
      });
    });

    return {
      totalSpend: total,
      totalTax: taxes,
      receiptCount: filtered.length,
      categoryBreakdown,
    };
  };

  const getFilteredReceipts = () => {
    return receipts.filter((r) => {
      const matchesSearch =
        r.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.items.some((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      const matchesCategory =
        selectedCategory === 'All' ||
        r.items.some((item) => item.category === selectedCategory);

      let matchesDate = true;
      if (dateRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        matchesDate = new Date(r.date) >= oneMonthAgo;
      } else if (dateRange === 'year') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        matchesDate = new Date(r.date) >= oneYearAgo;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  };

  const getQrUrl = () => {
    if (typeof window === 'undefined') return '';
    let base = window.location.href.split('?')[0];
    if (currentUserEmail) {
      base += `?autologin=${encodeURIComponent(currentUserEmail)}`;
    }
    return base;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getQrUrl());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  if (!currentUserEmail) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  const filteredReceiptsList = getFilteredReceipts();
  const currentStats = getStats();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Wallet className="text-emerald-400" size={20} />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                SmartReceipt
              </span>
              <span className="text-[9.5px] text-zinc-400 font-medium">
                Budget Intelligent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real Cloud Status Indicator */}
            {IS_FIREBASE_REAL && (
              <div
                onClick={() => !loadingSync && handleSyncData(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-bold cursor-pointer transition-all ${
                  loadingSync
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                    : syncError
                    ? 'bg-red-950/40 border-red-900/30 text-red-400 hover:bg-red-950/60'
                    : firestoreConnected === true
                    ? 'bg-emerald-950/50 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/70'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
                title={
                  syncError
                    ? `Erreur: ${syncError}. Cliquez pour réessayer.`
                    : 'Statut de synchronisation Cloud'
                }
              >
                {loadingSync ? (
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                ) : syncError ? (
                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                ) : (
                  <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {loadingSync
                    ? 'Synchronisation...'
                    : syncError
                    ? 'Synchro Échouée'
                    : 'Cloud Activé'}
                </span>
              </div>
            )}

            {/* Smart QR Scanner Mobile Connect */}
            <button
              onClick={() => setShowQrCode(true)}
              className="p-1.5 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Scanner le QR Code pour continuer sur mobile"
            >
              <QrCode size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Scanner Mobile</span>
            </button>

            {/* Premium Gold Badge */}
            <button
              onClick={() => !isPremium && setIsStripeOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                isPremium
                  ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 text-amber-400 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-600 hover:to-amber-700 shadow-md active:scale-95 border border-amber-400/30'
              }`}
            >
              <Sparkles
                size={13}
                className={
                  isPremium ? 'text-amber-400 animate-pulse' : 'text-zinc-950'
                }
              />
              <span>{isPremium ? 'Premium PRO' : 'Devenir PRO'}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Sync Error banner alerts */}
        {syncError && (
          <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p>
                Une erreur de synchronisation avec le serveur est survenue :{' '}
                <strong>{syncError}</strong>. Vos modifications restent
                enregistrées localement en toute sécurité.
              </p>
            </div>
            <button
              onClick={() => handleSyncData(false)}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-[10px] font-bold text-white cursor-pointer shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner on top left */}
          <div className="lg:col-span-2 space-y-6">
            <ReceiptScanner
              onScanSuccess={handleScanSuccess}
              isPremium={isPremium}
            />

            <FilterBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />

            <div className="flex items-center justify-between pb-1">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-400">
                Vos tickets de caisse
              </h3>
              <ExportButton receipts={filteredReceiptsList} />
            </div>

            <ReceiptList
              receipts={filteredReceiptsList}
              onSelectReceipt={setSelectedReceipt}
              onDeleteReceipt={handleDeleteReceipt}
            />
          </div>

          {/* Stats on side right */}
          <div className="space-y-6">
            <DashboardStats stats={currentStats} />
            <ChallengeCard stats={currentStats} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-10 mt-16 text-center text-xs text-zinc-600">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-zinc-500">
            SmartReceipt - Organisateur Écologique & Intelligent
          </p>
          <p>
            Analyse sémantique cryptée localement par intelligence artificielle
            et vision cognitive de pointe.
          </p>
          <p className="text-[10px] text-zinc-700 pt-2">
            © {new Date().getFullYear()} SmartReceipt. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* QR Code Connection Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full relative space-y-5 shadow-2xl">
            <button
              onClick={() => {
                setShowQrCode(false);
                setLinkCopied(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-black text-lg text-white">
                Continuer sur Mobile
              </h3>
              <p className="text-xs text-zinc-400">
                Idéal pour photographier directement vos tickets physiques avec
                l'appareil photo de votre smartphone !
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

            <div className="text-[10.5px] text-zinc-300 text-center leading-normal px-2 space-y-1">
              <p>
                Visez ce QR code avec l'appareil photo de votre smartphone pour
                continuer sur votre mobile.
              </p>
              {currentUserEmail && (
                <p className="text-emerald-400 font-semibold bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80 mt-1">
                  Connexion automatique configurée pour : {currentUserEmail}
                </p>
              )}
            </div>

            {/* Local development localhost warning callout */}
            {typeof window !== 'undefined' &&
              window.location.hostname === 'localhost' && (
                <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-300 rounded-xl text-[10px] space-y-1.5 text-left">
                  <p className="font-bold text-red-400">
                    ⚠️ Développement Local Détecté (VS Code)
                  </p>
                  <p className="leading-relaxed text-zinc-400">
                    Votre PC exécute l'application sur{' '}
                    <strong className="font-mono text-zinc-200">
                      localhost
                    </strong>
                    . Votre smartphone ne pourra pas se connecter à cette
                    adresse car "localhost" désigne le téléphone lui-même !
                  </p>
                  <p className="leading-relaxed font-medium text-zinc-300">
                    Pour tester sur mobile : connectez votre PC et smartphone au
                    même Wi-Fi, puis ouvrez l'adresse IP locale de votre PC (ex:{' '}
                    <span className="font-mono bg-zinc-950 text-indigo-300 px-1 py-0.5 rounded">
                      http://192.168.1.25:3000
                    </span>
                    ) dans votre navigateur PC avant de scanner ce QR code.
                  </p>
                </div>
              )}

            {currentUserEmail && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {linkCopied ? (
                    <Check
                      size={14}
                      className="text-emerald-400 animate-pulse"
                    />
                  ) : (
                    <Share2 size={14} />
                  )}
                  <span>
                    {linkCopied
                      ? 'Lien de connexion copié !'
                      : "Copier le lien d'accès direct"}
                  </span>
                </button>
                <p className="text-[9.5px] text-zinc-500 text-center leading-normal">
                  ⚠️ <strong>Important :</strong> Ouvrez impérativement le lien
                  dans votre navigateur habituel (Safari, Chrome...) et non dans
                  l'application appareil photo, pour partager correctement la
                  connexion !
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowQrCode(false);
                setLinkCopied(false);
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-750 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Stripe Checkout Modal */}
      <StripeCheckoutModal
        isOpen={isStripeOpen}
        onClose={() => setIsStripeOpen(false)}
        onSuccess={() => {
          setIsPremium(true);
          if (currentUserEmail) {
            const userId = currentUserEmail
              .toLowerCase()
              .replace(/[^a-zA-Z0-9_\-]/g, '_');
            localStorage.setItem(`premium_${userId}`, 'true');
          }
        }}
        userEmail={currentUserEmail}
      />

      {/* Details/Itemized View modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onDelete={handleDeleteReceipt}
        />
      )}
    </div>
  );
}
