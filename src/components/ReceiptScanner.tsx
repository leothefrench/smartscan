import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileImage,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DEMO_RECEIPTS } from '../data/demoReceipts';
import { Receipt } from '../types';

interface ReceiptScannerProps {
  onScanSuccess: (
    data: any,
    originalImageName: string,
    base64Preview?: string,
  ) => void;
}

const SCAN_LOADER_STEPS = [
  "Téléchargement de l'image de votre ticket...",
  'Lancement de la vision cognitive intelligente...',
  'Numérisation OCR haute fidélité du texte...',
  "Extraction sémantique des articles d'achat...",
  'Classification intelligente par thématiques...',
  'Validation finale des totaux et de la monnaie...',
];

export default function ReceiptScanner({ onScanSuccess }: ReceiptScannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMess, setErrorMess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMess(
        "S'il vous plaît, sélectionnez uniquement un fichier image (PNG, JPEG, HEIC, etc.).",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMess(null);

      // Read file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fullBase64 = reader.result as string;
          // Strip the data:image/*;base64, prefix for the back-end API
          const commaIdx = fullBase64.indexOf(',');
          const base64Data =
            commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;
          const mimeType = file.type;

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

          const result = await response.json();

          if (response.ok && result.success) {
            onScanSuccess(result.data, file.name, fullBase64);
          } else {
            throw new Error(
              result.error || "L'analyse a retourné un code d'échec.",
            );
          }
        } catch (err: any) {
          console.error(
            '[SmartReceipt Front DEBUG] Erreur lors du scan :',
            err,
          );
          setErrorMess(
            err.message ||
              "Une erreur est survenue lors de la communication ou de l'analyse du ticket.",
          );
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMess('Échec de la lecture du fichier image.');
        setLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setErrorMess(
        err.message ||
          "Une erreur inattendue est survenue lors de l'envoi du ticket.",
      );
      setLoading(false);
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

  return (
    <div
      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8 relative overflow-hidden"
      id="scanner-card-wrapper"
    >
      {/* Background glow effects for premium look */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-lg font-bold text-white tracking-tight mb-2 flex items-center gap-2">
        <Sparkles className="text-emerald-400 animate-pulse" size={18} />{' '}
        Numériser un Nouveau Ticket de Caisse
      </h2>
      <p className="text-xs text-zinc-400 mb-6 max-w-xl">
        Déposez une photo de votre ticket d'achat. L'intelligence artificielle
        Gemini analyse instantanément le contenu, extrait les articles, calcule
        la TVA et classe votre ticket.
      </p>

      {errorMess && (
        <div
          className="mb-4 p-4 bg-red-950/40 border border-red-900/50 text-red-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn"
          id="scanner-error"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <span className="font-semibold text-red-300">
              Erreur de traitement :
            </span>{' '}
            {errorMess}
          </div>
        </div>
      )}

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
              : 'border-zinc-500 bg-zinc-950/90 hover:border-emerald-400 hover:bg-emerald-950/10'
          }`}
          id="scanner-dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            capture="environment"
          />

          <div className="p-4 bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 text-zinc-300 group-hover:scale-105 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-all duration-300 mb-4">
            <Upload
              size={26}
              className="text-emerald-400 group-hover:animate-bounce"
            />
          </div>

          <p className="text-sm font-extrabold text-white tracking-tight group-hover:text-emerald-300">
            [ ZONE DE SCAN ] - Appuyez ici pour photographier ou choisir votre
            ticket
          </p>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
            Touchez cette zone en pointillés pour ouvrir l'appareil photo de
            votre smartphone ou pour y glisser un fichier.
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Formats acceptés : Photos en direct, PNG, JPG, JPEG
          </p>
        </div>
      )}
    </div>
  );
}
