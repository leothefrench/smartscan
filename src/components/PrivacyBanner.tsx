import React, { useState } from "react";
import { ShieldCheck, EyeOff, ServerCrash, Lock, ChevronDown, ChevronUp } from "lucide-react";

export default function PrivacyBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 mb-6 transition-all duration-300"
      id="privacy-gdpr-banner"
    >
      <div
        className="flex items-center justify-between cursor-pointer focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Conformité RGPD & Vie Privée Certifiée
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Européen
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Découvrez comment nous garantissons le respect absolu de vos
              données personnelles et de vos tickets.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          aria-label={isOpen ? 'Fermer les détails' : 'Ouvrir les détails'}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isOpen && (
        <div
          className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fadeIn"
          id="privacy-details"
        >
          {/* Pillar 1: No training */}
          <div className="space-y-1.5 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/60">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <EyeOff size={14} className="text-emerald-400" />
              Pas d'entraînement d'IA
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Vos photos de tickets ne sont <strong>pas utilisées</strong> pour
              entraîner des intelligences artificielles ou des modèles publics.
              Elles servent uniquement à l'analyse instantanée de votre ticket.
            </p>
          </div>

          {/* Pillar 2: Local storage explained and clear warn about clearing browser history/data */}
          <div className="space-y-1.5 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/60">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Lock size={14} className="text-emerald-400" />
              Stockage local 100% privé
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Vos données budgétaires restent enregistrées localement dans votre
              propre appareil.
              <span className="text-amber-400 font-semibold block mt-1">
                ⚠️ Mode Invité : Vos données sont locales et perdues en cas de
                nettoyage du navigateur. Connectez-vous pour lier vos tickets à
                votre compte (Gmail ou e-mail/OTP) : vos scans seront alors
                sauvegardés de façon sécurisée sur le Cloud Firestore et
                totalement protégés contre toute suppression accidentelle de
                votre appareil.
              </span>
            </p>
          </div>

          {/* Pillar 3: GDPR rights, ephemeral image */}
          <div className="space-y-1.5 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/60">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ServerCrash size={14} className="text-emerald-400" />
              Zéro trace sur le serveur
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              La photo du ticket est transmise temporairement et de façon
              éphémère pour en extraire la liste d'achats, puis elle est{' '}
              <strong>effacée de façon immédiate et définitive</strong> du
              serveur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
