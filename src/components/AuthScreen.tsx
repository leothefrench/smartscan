import React, { useState } from "react";
import { sanitizeInput, validateEmail } from "../utils/security";
import { ShieldCheck, Mail, KeyRound, Sparkles, Loader2, Info } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, IS_FIREBASE_REAL } from "../utils/firebase";

interface AuthScreenProps {
  onLoginSuccess: (email: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sanitizedPreview, setSanitizedPreview] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    if (!IS_FIREBASE_REAL || !auth) {
      setErrorMessage("La configuration de Firebase Google n'est pas activée en local.");
      return;
    }
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user?.email || "";
      if (email) {
        onLoginSuccess(email);
      } else {
        setErrorMessage("Impossible de récupérer l'adresse email de votre compte Google.");
      }
    } catch (err: any) {
      console.error("Erreur d'authentification Google Sign-In :", err);
      const errCode = err?.code ? `[${err.code}] ` : "";
      setErrorMessage(
        `${errCode}${err?.message || "Échec d'authentification avec Google. Veuillez réessayer."}`
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmailInput(val);
    setErrorMessage(null);
    setSecurityWarning(null);

    // Filter dangerous structures under the hood while providing a simple security layout
    const sqlIndicators = ["'", "or ", "select ", "union ", "1=1", "--", "/*"];
    if (sqlIndicators.some(keyword => val.toLowerCase().includes(keyword))) {
      setSecurityWarning("Filtre protecteur actif : votre saisie contient des caractères spéciaux non conformes. Notre système sécurise automatiquement votre saisie.");
      const cleaned = sanitizeInput(val);
      setSanitizedPreview(cleaned);
    } else {
      setSanitizedPreview(null);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanedEmail = sanitizeInput(emailInput).trim();
    
    console.log("=========================================");
    console.log("[SmartReceipt Front DEBUG] Soumission de l'adresse e-mail commencée !");
    console.log("-> Email brut :", emailInput);
    console.log("-> Email nettoyé :", cleanedEmail);
    console.log("=========================================");

    if (!validateEmail(cleanedEmail)) {
      console.warn("[SmartReceipt Front DEBUG] Format d'adresse e-mail invalide détecté.");
      setErrorMessage("S'il vous plaît, saisissez une adresse email valide !");
      return;
    }

    setLoading(true);

    try {
      console.log("[SmartReceipt Front DEBUG] Envoi de la requête POST vers /api/auth/otp/send...");
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanedEmail }),
      });

      console.log("[SmartReceipt Front DEBUG] Statut HTTP de la réponse :", response.status);
      
      let data: any = {};
      const contentType = response.headers.get("Content-Type") || response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
        console.log("[SmartReceipt Front DEBUG] Données JSON renvoyées par le backend :", data);
      } else {
        const textPreview = await response.text();
        throw new Error(`Le serveur a renvoyé du texte non-JSON (Statut ${response.status}). Début: "${textPreview.substring(0, 120)}..."`);
      }

      if (!response.ok || !data.success) {
        console.error("[SmartReceipt Front DEBUG] Le backend a rejeté la requête :", data.error);
        setErrorMessage(data.error || `Échec d'envoi du code (Statut ${response.status}).`);
        return;
      }

      // If backend reports simulated (e.g. no RESEND_API_KEY set) or if real mail was sent
      if (data.isSimulated) {
        console.log("[SmartReceipt Front DEBUG] Mode SIMULATION activé côté serveur.");
        if (data.code) {
          console.log("[SmartReceipt Front DEBUG] Code secret généré (simulation) :", data.code);
        }
        setIsSimulated(true);
        setGeneratedOtp(data.code);
      } else {
        console.log("[SmartReceipt Front DEBUG] Succès : un vrai e-mail a été expédié par Resend.");
        setIsSimulated(false);
        setGeneratedOtp(null);
      }

      setStep("otp");
    } catch (err: any) {
      console.error("[SmartReceipt Front DEBUG] Erreur réseau lors de la communication :", err);
      setErrorMessage(`Erreur Réseau/Serveur : ${err?.message || err?.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanedOtp = sanitizeInput(otpInput).trim();

    console.log("=========================================");
    console.log("[SmartReceipt Front DEBUG] Soumission du code OTP commencé !");
    console.log("-> Code saisi :", cleanedOtp);
    console.log("=========================================");

    if (cleanedOtp.length !== 8) {
      console.warn("[SmartReceipt Front DEBUG] Longueur de code incorrecte.");
      setErrorMessage("Le code de sécurité doit comporter exactement 8 chiffres.");
      return;
    }

    setLoading(true);

    try {
      const cleanedEmail = sanitizeInput(emailInput).trim();
      console.log("[SmartReceipt Front DEBUG] Envoi de la requête POST vers /api/auth/otp/verify...");
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanedEmail, code: cleanedOtp }),
      });

      console.log("[SmartReceipt Front DEBUG] Statut HTTP de la réponse :", response.status);
      
      let data: any = {};
      const contentType = response.headers.get("Content-Type") || response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
        console.log("[SmartReceipt Front DEBUG] Données JSON renvoyées :", data);
      } else {
        const textPreview = await response.text();
        throw new Error(`Le serveur de validation a renvoyé du texte non-JSON (Statut ${response.status}). Début: "${textPreview.substring(0, 120)}..."`);
      }

      if (!response.ok || !data.success) {
        console.error("[SmartReceipt Front DEBUG] Échec de la validation :", data.error);
        setErrorMessage(data.error || `Le code saisi est incorrect ou expiré (Statut ${response.status}).`);
        return;
      }

      console.log("[SmartReceipt Front DEBUG] Validation réussie ! Connexion de l'utilisateur...");
      // Success login
      onLoginSuccess(cleanedEmail);
    } catch (err: any) {
      console.error("[SmartReceipt Front DEBUG] Erreur réseau lors de la validation :", err);
      setErrorMessage(`Erreur de validation réseau : ${err?.message || err?.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden" id="auth-root" style={{ margin: 0 }}>
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Main Auth Container */}
      <div 
        className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-slideUp"
        id="auth-card"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mb-2">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartReceipt</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Accédez à votre espace de suivi budgétaire en toute sécurité. Simple, ultra-rapide et gratuit.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-950/45 border border-red-900/60 text-red-200 rounded-xl text-xs flex items-start gap-2 animate-fadeIn" id="auth-error">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Vérification échouée</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {securityWarning && (
          <div className="mb-5 p-3.5 bg-indigo-950/40 border border-indigo-900/60 text-indigo-200 rounded-xl text-xs space-y-1.5 animate-fadeIn" id="auth-warning">
            <p className="font-semibold text-indigo-350 flex items-center gap-1 text-[11px]">
              {securityWarning}
            </p>
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-id" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Votre adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  id="email-id"
                  type="text"
                  required
                  placeholder="exemple@domaine.fr"
                  value={emailInput}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 focus:bg-slate-900 text-xs text-white placeholder-slate-550 outline-none rounded-xl transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                🔒 Aucun mot de passe à retenir. Nous vous envoyons un code gratuit par e-mail.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !emailInput}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Connexion sécurisée...
                </>
              ) : (
                <>Recevoir mon code par e-mail →</>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="otp-id" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrez le code secret à 8 chiffres</label>
                <button 
                  type="button" 
                  onClick={() => setStep("email")}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Modifier l'e-mail
                </button>
              </div>
              
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  id="otp-id"
                  type="text"
                  required
                  maxLength={8}
                  placeholder="EX: 48923051"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-850 focus:border-indigo-500 text-xs text-white placeholder-slate-600 outline-none rounded-xl text-center font-mono tracking-widest text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.length < 8}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Vérification en cours...
                </>
              ) : (
                <>Valider & Ouvrir mon espace ✓</>
              )}
            </button>

            {/* Real vs Simulated secure email info box */}
            {isSimulated && generatedOtp && (
              <div className="mt-6 p-4 bg-indigo-950/35 border border-indigo-900/50 rounded-2xl animate-fadeIn text-xs" id="otp-simulator-box">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold mb-1">
                  <Sparkles size={13} className="text-amber-400" /> Simulateur local (Sans API Key) :
                </div>
                <p className="text-[11px] text-slate-300 mb-3">
                  Puisque la clé <span className="font-mono text-indigo-200">RESEND_API_KEY</span> n'est pas configurée dans votre fichier .env, voici le code d'accès généré côté serveur :
                </p>
                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-mono text-base font-extrabold tracking-widest text-indigo-400">{generatedOtp}</span>
                  <button
                    type="button"
                    onClick={() => setOtpInput(generatedOtp)}
                    className="text-[10px] font-bold bg-indigo-600/20 text-indigo-300 px-2.5 py-1 rounded hover:bg-indigo-600/35 transition cursor-pointer"
                  >
                    Coller le code secret
                  </button>
                </div>
              </div>
            )}

            {!isSimulated && (
              <div className="mt-6 p-4 bg-emerald-950/35 border border-emerald-900/50 rounded-2xl animate-fadeIn text-xs" id="otp-sent-box">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                  <Sparkles size={13} className="text-emerald-400" /> E-mail sécurisé envoyé !
                </div>
                <p className="text-[11px] text-zinc-300">
                  Un code unique de validation a été envoyé par e-mail avec succès à l'adresse <span className="font-mono text-emerald-250">{emailInput}</span>. Merci de vérifier votre boîte de réception ou vos spams.
                </p>
              </div>
            )}
          </form>
        )}

        {/* Google Sign-In provider button if Firebase is active */}
        {IS_FIREBASE_REAL && (
          <div className="mt-5 space-y-4 animate-fadeIn" id="google-auth-provider">
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="mx-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ou</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin text-indigo-400" size={14} />
              ) : (
                <span className="shrink-0 text-white font-mono font-black select-none text-[13px] bg-red-600/10 border border-red-500/20 w-5 h-5 flex items-center justify-center rounded-md">G</span>
              )}
              Se connecter avec Google
            </button>
          </div>
        )}

        {/* Security / anti-fraud info widget */}
        <div className="mt-6 pt-5 border-t border-slate-900 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-slate-400">
            <Info size={11} className="text-emerald-400" /> Protection des Données Certifiée
          </div>
          <p className="leading-relaxed text-slate-450">
            Tous les flux de données transitent via nos algorithmes de filtrage intelligents intégrés pour assurer la protection optimale et absolue de vos informations d'achats privées.
          </p>
        </div>
      </div>
    </div>
  );
}
