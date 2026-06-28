import React from 'react';
import { X, ShieldAlert, BadgeInfo, Scale, ShieldCheck } from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalTermsModal({
  isOpen,
  onClose,
}: LegalTermsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      id="legal-terms-modal"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative shadow-2xl">
        {/* Absolute top right close cross */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1.5 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
          type="button"
          title="Fermer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center gap-2 shrink-0">
          <Scale size={16} className="text-amber-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Conditions Générales (CGU / CGV)
          </h2>
        </div>

        {/* Modal Scrollable Core Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-zinc-300 space-y-5 custom-scrollbar">
          <div className="space-y-1.5 border-b border-zinc-900 pb-3">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <BadgeInfo size={14} className="text-amber-400" />
              1. Essai de 7 jours & Conditions de Vente (CGV)
            </h3>
            <p className="leading-relaxed text-zinc-400">
              SmartScan propose un accès d'évaluation de{' '}
              <strong>7 jours entièrement gratuit</strong> à l'offre Premium
              PRO. Vous pouvez utiliser toutes les fonctionnalités de lecture
              automatique de tickets, de synchronisation Cloud et d'exports de
              manière illimitée pendant cette période.
            </p>
            <p className="leading-relaxed text-zinc-400">
              À l'issue de cet essai de 7 jours, l'abonnement mensuel de{' '}
              <strong>4,99 €/mois</strong> est activé automatiquement, sauf
              résiliation explicite effectuée avant la fin de la période
              d'essai.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-zinc-900 pb-3">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <Scale size={14} className="text-amber-400" />
              2. Exécution Immédiate & Renonciation à la Rétractation
            </h3>
            <p className="leading-relaxed text-zinc-305 font-medium">
              Conformément à la directive européenne sur les droits des
              consommateurs (transposée en France à l'
              <strong>Article L221-28 13° du Code de la consommation</strong>) :
            </p>
            <div
              role="region"
              aria-label="Consentement exprès de renonciation au droit de rétractation"
              className="leading-relaxed text-zinc-100 bg-zinc-900 border-l-4 border-amber-500 p-4 rounded-r-xl border-y border-r border-zinc-850 my-3 text-[11px] shadow-sm select-auto"
            >
              <span className="text-amber-400 font-bold block mb-1">
                🔴 Dérogations & Renonciation d'exécution immédiate :
              </span>
              En demandant l'accès immédiat à l'abonnement Premium PRO dès la
              souscription (lecture et analyse automatique de tickets, exports
              illimités),{' '}
              <strong className="text-white underline decoration-amber-500/50 decoration-2 underline-offset-2">
                l'utilisateur consent expressément à ce que le service débute
                immédiatement et renonce de fait à son droit de rétractation
                légal de 14 jours
              </strong>
              .
            </div>
            <p className="leading-relaxed text-zinc-400">
              Cette case de consentement obligatoire cochée lors de la
              confirmation du panier valide légalement cette renonciation pour
              permettre la fourniture immédiate du contenu numérique de manière
              instantanée.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-zinc-900 pb-3">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" />
              3. Résiliation immédiate en un clic
            </h3>
            <p className="leading-relaxed text-zinc-400">
              Notre offre est <strong>sans aucun engagement de durée</strong>.
              Vous disposez d'un droit absolu de résiliation immédiate en un
              seul clic à tout moment. Il vous suffit d'appuyer sur le bouton de
              désactivation <strong>"Résilier l'abonnement"</strong> disponible
              sur votre tableau de bord.
            </p>
            <p className="leading-relaxed text-zinc-400">
              Aucun frais de fermeture ou pénalité ne vous seront jamais
              imputés. Votre abonnement prendra simplement fin à la date
              d'échéance de la période en cours.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-zinc-900 pb-3">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              4. RGPD & Protection absolue de votre vie privée (CGU)
            </h3>
            <p className="leading-relaxed text-zinc-400">
              Le traitement de vos photos de reçus et factures s'effectue dans
              le strict respect de la réglementation européenne{' '}
              <strong>RGPD</strong> :
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-400">
              <li>
                Vos scans sont temporairement envoyés au moteur sémantique pour
                extraction textuelle sécurisée et ne sont jamais revendus.
              </li>
              <li>
                Toutes vos synthèses, catégorisations et montages d'achats sont
                cryptés de bout en bout.
              </li>
              <li>
                Aucune donnée n'est exploitée pour entraîner des modèles IA
                tiers.
              </li>
            </ul>
          </div>

          <div className="space-y-1.5 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4">
            <h4 className="font-bold text-white">
              4. Éditeur de l'application & Contact
            </h4>
            <p className="leading-normal text-zinc-400 text-[11px] mt-1">
              Pour toute question relative à vos factures, un remboursement ou
              pour exercer votre droit d'accès et de suppression de vos données
              personnelles, veuillez contacter directement notre équipe
              d'assistance par e-mail :
            </p>
            <a
              href="mailto:leothefrench@gmail.com"
              className="mt-1.5 inline-block font-mono text-xs text-amber-400 hover:text-amber-300 font-bold underline"
            >
              leothefrench@gmail.com
            </a>
          </div>
        </div>

        {/* Modal Footer actions */}
        <div className="bg-zinc-900 p-4 border-t border-zinc-800 flex items-center justify-end shrink-0 gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2 px-6 rounded-xl transition-all cursor-pointer text-center"
            type="button"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
