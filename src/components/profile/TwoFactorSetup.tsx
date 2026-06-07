import { useState } from 'react';
import { X, ShieldCheck, ShieldOff, Smartphone, Copy, Check } from 'lucide-react';
import { generateURI } from 'otplib';
import QRCode from 'qrcode';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  onClose: () => void;
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'done';

export default function TwoFactorSetup({ onClose }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const generateTwoFactorSecret = useAuthStore(s => s.generateTwoFactorSecret);
  const enableTwoFactor = useAuthStore(s => s.enableTwoFactor);
  const disableTwoFactor = useAuthStore(s => s.disableTwoFactor);

  const [step, setStep] = useState<SetupStep>(currentUser?.twoFactorEnabled ? 'done' : 'intro');
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    if (!currentUser) return;
    const newSecret = generateTwoFactorSecret(currentUser.id);
    setSecret(newSecret);
    const otpauthUrl = generateURI({ secret: newSecret, label: currentUser.email, issuer: "Ville à hauteur d'enfant" });
    const url = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 1 });
    setQrUrl(url);
    setStep('scan');
  };

  const handleVerify = () => {
    if (!currentUser) return;
    setError('');
    const ok = enableTwoFactor(currentUser.id, secret, token.replace(/\s/g, ''));
    if (!ok) {
      setError('Code invalide. Vérifiez l\'heure de votre téléphone et réessayez.');
      setToken('');
      return;
    }
    setStep('done');
  };

  const handleDisable = () => {
    if (!currentUser) return;
    if (confirm('Désactiver la double authentification ? Votre compte sera moins sécurisé.')) {
      disableTwoFactor(currentUser.id);
      setStep('intro');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Double authentification (2FA)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* INTRO */}
          {step === 'intro' && (
            <div className="space-y-5 text-center">
              <div className="bg-green-50 rounded-xl p-6">
                <Smartphone className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-gray-800 mb-2">Sécurisez votre compte</p>
                <p className="text-sm text-gray-600">
                  La double authentification ajoute un code à 6 chiffres généré par votre téléphone à chaque connexion.
                  Compatible avec Google Authenticator, Authy, ou tout autre application TOTP.
                </p>
              </div>
              <button
                onClick={startSetup}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors min-h-[44px]"
              >
                Activer la 2FA
              </button>
            </div>
          )}

          {/* SCAN QR */}
          {step === 'scan' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="font-semibold text-gray-800 mb-1">1. Scannez ce QR code</p>
                <p className="text-sm text-gray-500 mb-4">
                  Ouvrez votre application authenticator et scannez ce code.
                </p>
                {qrUrl && (
                  <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                    <img src={qrUrl} alt="QR Code 2FA" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Ou entrez la clé manuellement :</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <code className="flex-1 text-xs font-mono text-gray-700 break-all">{secret}</code>
                  <button onClick={copySecret} className="p-1.5 hover:bg-gray-200 rounded min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors min-h-[44px]"
              >
                J'ai scanné le code →
              </button>
            </div>
          )}

          {/* VERIFY */}
          {step === 'verify' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="font-semibold text-gray-800 mb-1">2. Vérifiez le code</p>
                <p className="text-sm text-gray-500">
                  Entrez le code à 6 chiffres affiché dans votre application pour confirmer la configuration.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code d'authentification</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={e => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
              )}

              <button
                onClick={handleVerify}
                disabled={token.length < 6}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
              >
                Activer la 2FA
              </button>

              <button
                type="button"
                onClick={() => setStep('scan')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 min-h-[44px]"
              >
                ← Retour au QR code
              </button>
            </div>
          )}

          {/* DONE / ENABLED */}
          {step === 'done' && (
            <div className="space-y-5 text-center">
              <div className="bg-green-50 rounded-xl p-6">
                <ShieldCheck className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-green-800 mb-2">2FA activée ✓</p>
                <p className="text-sm text-gray-600">
                  Votre compte est protégé. Un code sera demandé à chaque connexion.
                </p>
              </div>
              <button
                onClick={handleDisable}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2.5 rounded-lg transition-colors min-h-[44px] text-sm"
              >
                <ShieldOff className="w-4 h-4" />
                Désactiver la 2FA
              </button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
