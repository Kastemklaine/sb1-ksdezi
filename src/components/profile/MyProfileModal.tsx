import { useState, useEffect } from 'react';
import { X, Save, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore, curProject } from '../../store/useProjectStore';

interface Props {
  onClose: () => void;
}

export default function MyProfileModal({ onClose }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const updateMyProfile = useAuthStore(s => s.updateMyProfile);
  const changeMyPassword = useAuthStore(s => s.changeMyPassword);
  const fonctions = useProjectStore(s => curProject(s)?.fonctions ?? []);

  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [fonction, setFonction] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const parts = currentUser.name.split(' ');
    setFirstName(currentUser.firstName ?? (parts.length > 1 ? parts.slice(0, -1).join(' ') : currentUser.name));
    setLastName(currentUser.lastName ?? (parts.length > 1 ? parts[parts.length - 1] : ''));
    setEmail(currentUser.email);
    setFonction(currentUser.fonction ?? '');
  }, [currentUser]);

  const handleSaveProfile = () => {
    if (!firstName.trim()) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    updateMyProfile({ name, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), fonction: fonction || undefined });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleChangePassword = () => {
    setPwError('');
    if (!currentPw) return setPwError('Veuillez saisir votre mot de passe actuel.');
    if (newPw.length < 8) return setPwError('Le nouveau mot de passe doit faire au moins 8 caractères.');
    if (newPw !== confirmPw) return setPwError('Les mots de passe ne correspondent pas.');
    const ok = changeMyPassword(currentPw, newPw);
    if (!ok) return setPwError('Mot de passe actuel incorrect.');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Mon profil</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'profile' ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Informations
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'password' ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mot de passe
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'profile' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Marie"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fonction</label>
                <div className="flex flex-wrap gap-2">
                  {fonctions.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFonction(prev => prev === f ? '' : f)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        fonction === f ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {fonction && (
                  <p className="mt-2 text-xs text-indigo-600">Sélectionné : <strong>{fonction}</strong></p>
                )}
              </div>
              <div className="pt-2">
                {profileSaved && (
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-3">
                    <CheckCircle className="w-4 h-4" /> Profil mis à jour.
                  </div>
                )}
                <button
                  onClick={handleSaveProfile}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe <span className="text-gray-400 font-normal">(min. 8 car.)</span></label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {pwError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
                </div>
              )}
              {pwSaved && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" /> Mot de passe modifié avec succès.
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors min-h-[44px]"
                >
                  <Lock className="w-4 h-4" />
                  Changer le mot de passe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
