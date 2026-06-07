import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginPage() {
  const login = useAuthStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = login(email, password);
    if (!result.success) {
      setError(result.error ?? 'Erreur de connexion');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md px-4 py-8 sm:px-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-600 rounded-full p-4 mb-4">
            <Lightbulb className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Ville à hauteur d'enfant</h1>
          <p className="text-green-600 font-medium mt-1">Vers la 4e fleur</p>
          <p className="text-gray-500 text-sm mt-2 text-center">Outil de gestion de projet collaboratif</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-base"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 mb-2">Comptes de démonstration :</p>
          <p>Super admin : admin@ville-enfant.fr / admin123</p>
          <p>Admin : marie@ville-enfant.fr / marie123</p>
          <p>Membre : jean@ville-enfant.fr / jean123</p>
        </div>
      </div>
    </div>
  );
}
