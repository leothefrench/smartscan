import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileImage,
  Sparkles,
  AlertCircle,
  Loader2,
  Plus,
  Calendar,
  Coffee,
  Coins,
  Euro,
  Tag,
  Store,
  Check,
} from 'lucide-react';
import { Receipt, ReceiptCategory } from '../types';
import { sanitizeInput } from '../utils/security';

interface ReceiptScannerProps {
  onScanSuccess: (
    data: any,
    originalImageName: string,
    base64Preview?: string,
  ) => void;
  isPremium?: boolean;
}

const SCAN_LOADER_STEPS = [
  "Téléchargement de l'image de votre ticket...",
  'Lancement de la vision cognitive intelligente...',
  'Lecture automatique et précise du texte...',
  "Extraction sémantique des articles d'achat...",
  'Classification intelligente par thématiques...',
  'Validation finale des totaux et de la monnaie...',
];

export default function ReceiptScanner({
  onScanSuccess,
  isPremium = false,
}: ReceiptScannerProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');

  // OCR Scan states
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMess, setErrorMess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual fast entry states
  const [itemName, setItemName] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [itemCategory, setItemCategory] =
    useState<ReceiptCategory>('Alimentation');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDate, setItemDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [manualSuccess, setManualSuccess] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<
    'weekly' | 'monthly' | 'yearly'
  >('monthly');

  // Rotate loading step description to make it extremely alive
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % SCAN_LOADER_STEPS.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const compressImageClientSide = (
    file: File,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
  ): Promise<{ base64Data: string; fullBase64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Resize keeping aspect ratio if larger than constraints
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(
              new Error(
                "Impossible d'initialiser le moteur de compression d'image local (canvas 2D).",
              ),
            );
            return;
          }

          // Render image to canvas with the new scaled sizes
          ctx.drawImage(img, 0, 0, width, height);

          // Downscale & compress to highly-optimized image/jpeg
          const fullBase64 = canvas.toDataURL('image/jpeg', quality);

          // Strip the data:image/jpeg;base64, prefix for the endpoint representation
          const commaIdx = fullBase64.indexOf(',');
          const base64Data =
            commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;

          resolve({
            base64Data,
            fullBase64,
            mimeType: 'image/jpeg',
          });
        };
        img.onerror = () =>
          reject(
            new Error(
              'Données de fichier image illisibles. Réessayez avec un autre cliché.',
            ),
          );
        img.src = event.target?.result as string;
      };
      reader.onerror = () =>
        reject(
          new Error("Impossible de lire l'image à partir du disque local."),
        );
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setErrorMess(
        "S'il vous plaît, sélectionnez uniquement un fichier image (PNG, JPEG, HEIC, etc.) ou un document PDF.",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMess(null);

      if (isImage) {
        // Safe, lighting fast client-side image compression downscaling
        const { base64Data, fullBase64, mimeType } =
          await compressImageClientSide(file);

        // Post to backend scanning endpoint
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data,
            mimeType,
          }),
        });

        const textResponse = await response.text();
        let result: any;
        try {
          result = JSON.parse(textResponse);
        } catch (jsonErr) {
          console.error(
            '[SmartReceipt Front DEBUG] Réponse brute NON-JSON du serveur :',
            textResponse,
          );
          // Check for classic request entity too large or platform size limit errors
          if (
            textResponse.includes('too large') ||
            textResponse.includes('Entity Too Large') ||
            textResponse.includes('Payload Too Large')
          ) {
            throw new Error(
              "L'image est encore trop grande ou dépasse la limite de transfert du réseau Cloud. Veuillez prendre un cliché de plus faible résolution ou ré-essayer.",
            );
          }
          throw new Error(
            'Le serveur a retourné une réponse inattendue. Veuillez vérifier votre connexion.',
          );
        }

        if (response.ok && result.success) {
          onScanSuccess(result.data, file.name, fullBase64);
        } else {
          throw new Error(
            result.error ||
              "L'analyse AI a échoué. Réessayez avec un cliché plus net.",
          );
        }
      } else {
        // Standard non-compressed PDF processing flow
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const fullBase64 = reader.result as string;
            const commaIdx = fullBase64.indexOf(',');
            const base64Data =
              commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;
            const mimeType = file.type;

            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: base64Data,
                mimeType,
              }),
            });

            const textResponse = await response.text();
            let result: any;
            try {
              result = JSON.parse(textResponse);
            } catch (jsonErr) {
              console.error(
                '[SmartReceipt Front DEBUG] Réponse brute NON-JSON pour PDF :',
                textResponse,
              );
              throw new Error(
                "Le fichier PDF est trop lourd ou complexe pour le serveur d'analyse.",
              );
            }

            if (response.ok && result.success) {
              onScanSuccess(result.data, file.name, fullBase64);
            } else {
              throw new Error(
                result.error || "L'analyse a retourné un code d'échec.",
              );
            }
          } catch (err: any) {
            console.error(
              '[SmartReceipt Front DEBUG] Erreur lors du scan PDF :',
              err,
            );
            setErrorMess(
              err.message ||
                "Une erreur est survenue lors de l'analyse du PDF.",
            );
          } finally {
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setErrorMess('Échec de la lecture du fichier PDF.');
          setLoading(false);
        };

        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(
        '[SmartReceipt Front DEBUG] Erreur générale lors du scan :',
        err,
      );
      setErrorMess(
        err.message ||
          "Une erreur inattendue est survenue lors de l'envoi du ticket.",
      );
    } finally {
      // In image mode, we must set loading to false here because the async chain is handled by await and is sequential, unlike the PDF onload event
      if (isImage) {
        setLoading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess(null);

    const trimmedItemName = itemName.trim();
    if (!trimmedItemName) {
      setErrorMess(
        "Veuillez saisir l'intitulé de l'achat (ex: Café expresso).",
      );
      return;
    }

    // Defensive input filtering & XSS prevention
    const sanitizedName = sanitizeInput(trimmedItemName);
    if (!sanitizedName) {
      setErrorMess(
        'Veuillez saisir une désignation valide. Les balises HTML ou scripts ne sont pas autorisés.',
      );
      return;
    }

    const finalAmount = parseFloat(itemAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMess('Veuillez saisir un montant valide supérieur à 0 €.');
      return;
    }

    const trimmedMerchant = merchantName.trim() || 'Achat Cash / Comptoir';
    const sanitizedMerchant = sanitizeInput(trimmedMerchant);

    // Create a complete high fidelity Receipt structure
    const manualReceipt: Receipt = {
      id: `receipt-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      merchant: sanitizedMerchant,
      date: itemDate || new Date().toISOString().split('T')[0],
      totalAmount: finalAmount,
      taxAmount: parseFloat((finalAmount * 0.1).toFixed(2)), // Approx 10% average VAT
      currency: 'EUR',
      scannedAt: new Date().toISOString(),
      rawResponse: isRecurring
        ? `Prélèvement ou abonnement périodique récurrent (${
            recurrenceInterval === 'weekly'
              ? 'Hebdomadaire'
              : recurrenceInterval === 'monthly'
              ? 'Mensuel'
              : 'Annuel'
          }).\nLibellé : ${sanitizedName}\nFrais fixes récurrents.`
        : `Dépense saisie manuellement au comptoir.\nLibellé : ${sanitizedName}\nMode : Sans ticket papier / Cash`,
      isRecurring: isRecurring,
      recurrence: isRecurring ? recurrenceInterval : undefined,
      items: [
        {
          id: `item-manual-${Date.now()}-1`,
          name: sanitizedName,
          quantity: 1,
          price: finalAmount,
          category: itemCategory,
        },
      ],
    };

    onScanSuccess(manualReceipt, 'Saisie manuelle');

    // Success response
    setManualSuccess(true);
    setItemName('');
    setMerchantName('');
    setItemAmount('');
    setIsRecurring(false);
    setRecurrenceInterval('monthly');

    setTimeout(() => {
      setManualSuccess(false);
    }, 4000);
  };

  const categories: ReceiptCategory[] = [
    'Alimentation',
    'Loisirs & Culture',
    'Santé & Hygiène',
    'Mode & Habillement',
    'Électronique & Maison',
    'Transport & Carburant',
    'Services & Factures',
    'Autre',
  ];

  return (
    <div
      className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 mb-8 relative overflow-hidden"
      id="scanner-card-wrapper"
    >
      {/* Background glow effects for premium look */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles
              className="text-emerald-400 animate-pulse shrink-0"
              size={18}
            />{' '}
            Enregistrer des transactions
            {isPremium && (
              <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-bold uppercase tracking-wider shrink-0 select-none animate-pulse">
                Premium Actif
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Ajoutez de nouvelles dépenses via la photo inteligente de vos
            tickets de caisse ou directement par saisie manuelle rapide pour vos
            cafés et vos dépenses en pièces de monnaie.
          </p>
        </div>

        {/* Tab Layout selectors */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-700 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan');
              setErrorMess(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-zinc-900 text-emerald-400 border border-zinc-700 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileImage size={13} />
            Scanner Photo
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setErrorMess(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-zinc-900 text-emerald-400 border border-zinc-700 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coffee size={13} />
            Saisie Cash / Café
          </button>
        </div>
      </div>

      {errorMess && (
        <div
          className="mb-4 p-4 bg-red-950/40 border border-red-900/50 text-red-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn"
          id="scanner-error"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <span className="font-semibold text-red-300">Erreur :</span>{' '}
            {errorMess}
          </div>
        </div>
      )}

      {manualSuccess && (
        <div
          className="mb-4 p-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn"
          id="manual-success"
        >
          <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <span className="font-semibold text-emerald-300">Succès !</span>{' '}
            Votre dépense comptoir/café a été enregistrée manuellement et
            synchronisée. Elle est désormais intégrée à votre historique de
            dépenses et vos défis.
          </div>
        </div>
      )}

      {activeTab === 'scan' ? (
        <>
          {loading ? (
            <div
              className="border border-dashed border-emerald-800/80 bg-zinc-950/60 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[220px]"
              id="scanner-loading-view"
            >
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute w-12 h-12 bg-emerald-900/30 rounded-full animate-ping opacity-60" />
                <div className="relative p-3 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-950/50">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              </div>
              <span className="text-sm font-semibold text-white mt-1 uppercase tracking-wide">
                Analyse en cours...
              </span>
              <p className="text-xs text-zinc-300 mt-2 font-medium max-w-md animate-pulse">
                {SCAN_LOADER_STEPS[loadingStep]}
              </p>
              <div className="w-48 bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden border border-zinc-800">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: '100%', animation: 'loadingBar 2s infinite' }}
                />
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[225px] group ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-950/25 scale-[1.01]'
                  : 'border-zinc-400 bg-zinc-950/90 hover:border-emerald-400 hover:bg-emerald-950/10'
              }`}
              id="scanner-dropzone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf"
              />

              <div className="p-4 bg-zinc-900 rounded-2xl shadow-sm border border-zinc-700 text-zinc-300 group-hover:scale-105 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-all duration-300 mb-4">
                <Upload
                  size={26}
                  className="text-emerald-400 group-hover:animate-bounce"
                />
              </div>

              <p className="text-sm font-extrabold text-white tracking-tight group-hover:text-emerald-300">
                [ ZONE DE SCAN ] - Appuyez ici pour photographier ou choisir
                votre ticket (Image ou PDF)
              </p>
              <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
                Touchez cette zone en pointillés pour ouvrir l'appareil
                photo/les fichiers de votre smartphone ou pour y glisser un
                fichier.
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Formats acceptés : Photos en direct, PNG, JPG, JPEG, PDF
              </p>
            </div>
          )}
        </>
      ) : (
        /* Manual Quick Form */
        <form
          onSubmit={handleManualSubmit}
          className="bg-zinc-950/80 rounded-2xl p-5 border border-zinc-700 space-y-4 font-sans"
          id="manual-expense-form"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Libellé */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Coffee size={13} className="text-emerald-400" /> Désignation de
                l'achat *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="ex: Café crème & Croissant, Sandwich midi..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs rounded-xl px-3.5 py-2.5 text-white transition-all placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Commerçant ou lieu */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Store size={13} className="text-zinc-500" /> Lieu ou Enseigne
              </label>
              <input
                type="text"
                placeholder="ex: Café de Flore, Boulangerie, Comptoir..."
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs rounded-xl px-3.5 py-2.5 text-white transition-all placeholder:text-zinc-600 focus:outline-none"
              />
            </div>

            {/* Montant */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Euro size={13} className="text-emerald-400" /> Montant payé (€)
                *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="ex: 3.50"
                  value={itemAmount}
                  onChange={(e) => setItemAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs rounded-xl px-3.5 py-2.5 text-white transition-all font-mono placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Calendar size={13} className="text-zinc-505" /> Date d'achat
              </label>
              <input
                type="date"
                required
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs rounded-xl px-3.5 py-2.5 text-white transition-all font-mono focus:outline-none"
              />
            </div>

            {/* Catégorie */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Tag size={13} className="text-emerald-500" /> Catégorie de
                budget
              </label>
              <select
                value={itemCategory}
                onChange={(e) =>
                  setItemCategory(e.target.value as ReceiptCategory)
                }
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs rounded-xl px-3.5 py-2.5 text-white transition-all focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Prélèvement récurrent - Case à cocher & fréquence */}
            <div className="md:col-span-2 border-t border-zinc-900 pt-3 mt-1 space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-zinc-300 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (e.target.checked) {
                      setItemCategory('Services & Factures');
                    }
                  }}
                  className="mt-0.5 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
                <div>
                  <span className="text-white font-bold block">
                    Abonnement ou Prélèvement récurrent
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Cochez cette option s'il s'agit d'une charge fixe périodique
                    (Netflix, Spotify, salle de sport, électricité, loyer...)
                  </span>
                </div>
              </label>

              {isRecurring && (
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-950 border border-zinc-900 rounded-xl max-w-md animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => setRecurrenceInterval('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                      recurrenceInterval === 'weekly'
                        ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Hebdomadaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurrenceInterval('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                      recurrenceInterval === 'monthly'
                        ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurrenceInterval('yearly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                      recurrenceInterval === 'yearly'
                        ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Annuel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Plus size={14} />
              Enregistrer la dépense cash
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
