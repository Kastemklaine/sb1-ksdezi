import { useState, useRef, useEffect } from 'react';
import { Lightbulb, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore, getPendingTwoFactorEmail } from '../../store/useAuthStore';

type Step = 'credentials' | 'totp';

export default function LoginPage() {
  const login = useAuthStore(s => s.login);
  const verifyTwoFactor = useAuthStore(s => s.verifyTwoFactor);

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'totp') tokenRef.current?.focus();
  }, [step]);

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = login(email, password);
    setLoading(false);
    if (result.status === 'error') {
      setError(result.message);
    } else if (result.status === 'needs_2fa') {
      setStep('totp');
    }
    // 'ok' → App re-renders with currentUser set
  };

  const handleTotp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pending = getPendingTwoFactorEmail();
    if (!pending) { setStep('credentials'); return; }
    const valid = verifyTwoFactor(pending, token.replace(/\s/g, ''));
    if (!valid) {
      setError('Code invalide ou expiré. Réessayez.');
      setToken('');
      tokenRef.current?.focus();
    }
    // valid → App re-renders with currentUser set
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md px-4 py-8 sm:px-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-600 rounded-full p-4 mb-4">
            {step === 'totp' ? (
              <ShieldCheck className="text-white w-8 h-8" />
            ) : (
              <Lightbulb className="text-white w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            {step === 'totp' ? 'Vérification 2FA' : "Ville à hauteur d'enfant"}
          </h1>
          <p className="text-green-600 font-medium mt-1">Vers la 4e fleur</p>
          <p className="text-gray-500 text-sm mt-2 text-center">
            {step === 'totp'
              ? 'Entrez le code à 6 chiffres de votre application authenticator'
              : 'Outil de gestion de projet collaboratif'}
          </p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="votre@email.fr"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-base"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code d'authentification</label>
              <input
                ref={tokenRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                value={token}
                onChange={e => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={token.length < 6}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-base"
            >
              Vérifier
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setToken(''); setError(''); }}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </button>
          </form>
        )}

        {step === 'credentials' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600 mb-2">Comptes de démonstration :</p>
            <p>Super admin : admin@ville-enfant.fr / admin123</p>
            <p>Admin : marie@ville-enfant.fr / marie123</p>
            <p>Membre : jean@ville-enfant.fr / jean123</p>
          </div>
        )}
      </div>
    </div>
  );
}
