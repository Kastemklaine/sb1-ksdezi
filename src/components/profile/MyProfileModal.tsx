import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Lock, User, AlertCircle, CheckCircle, Camera, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore, curProject } from '../../store/useProjectStore';

interface Props {
  onClose: () => void;
}

// ---- Avatar Crop Component ----
interface CropProps {
  src: string;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}

function AvatarCrop({ src, onCrop, onCancel }: CropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const SIZE = 240;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw(img, 1, 0, 0);
    };
    img.src = src;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback((img: HTMLImageElement, z: number, ox: number, oy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // Clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max(SIZE / img.width, SIZE / img.height) * z;
    const sw = img.width * scale;
    const sh = img.height * scale;
    const x = (SIZE - sw) / 2 + ox;
    const y = (SIZE - sh) / 2 + oy;
    ctx.drawImage(img, x, y, sw, sh);
    ctx.restore();
    // Circle border
    ctx.strokeStyle = '#00c875';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (imgRef.current) draw(imgRef.current, zoom, offsetX, offsetY);
  }, [zoom, offsetX, offsetY, draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffsetX(dragStart.current.ox + (e.clientX - dragStart.current.x));
    setOffsetY(dragStart.current.oy + (e.clientY - dragStart.current.y));
  };
  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offsetX, oy: offsetY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging || !dragStart.current) return;
    const t = e.touches[0];
    setOffsetX(dragStart.current.ox + (t.clientX - dragStart.current.x));
    setOffsetY(dragStart.current.oy + (t.clientY - dragStart.current.y));
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCrop(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Glissez l'image pour centrer, ajustez le zoom.</p>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing border-2 border-[#00c875] shadow-md"
          style={{ touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => setDragging(false)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Zoom</label>
        <input
          type="range" min={1} max={3} step={0.05}
          value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          className="w-full accent-[#00c875]"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Annuler</button>
        <button onClick={handleCrop} className="flex-1 py-2.5 bg-[#00c875] hover:bg-[#009660] text-white rounded-lg text-sm font-medium transition-colors">Appliquer</button>
      </div>
    </div>
  );
}

// ---- Main Modal ----
export default function MyProfileModal({ onClose }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const updateMyProfile = useAuthStore(s => s.updateMyProfile);
  const changeMyPassword = useAuthStore(s => s.changeMyPassword);
  const fonctions = useProjectStore(s => curProject(s)?.fonctions ?? []);

  const [tab, setTab] = useState<'profile' | 'photo' | 'password'>('profile');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [fonction, setFonction] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Photo
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropped = (dataUrl: string) => {
    updateMyProfile({ avatarUrl: dataUrl });
    setCropSrc(null);
    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 2500);
  };

  const handleRemovePhoto = () => {
    updateMyProfile({ avatarUrl: undefined });
    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 2500);
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
          {(['profile', 'photo', 'password'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'profile' ? 'Informations' : t === 'photo' ? 'Photo' : 'Mot de passe'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Marie" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Dupont" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fonction</label>
                <div className="flex flex-wrap gap-2">
                  {fonctions.map(f => (
                    <button key={f} type="button" onClick={() => setFonction(prev => prev === f ? '' : f)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${fonction === f ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>
                {fonction && <p className="mt-2 text-xs text-indigo-600">Sélectionné : <strong>{fonction}</strong></p>}
              </div>
              <div className="pt-2">
                {profileSaved && (
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-3">
                    <CheckCircle className="w-4 h-4" /> Profil mis à jour.
                  </div>
                )}
                <button onClick={handleSaveProfile}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors min-h-[44px]">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Photo tab */}
          {tab === 'photo' && (
            <div className="p-4 space-y-4">
              {cropSrc ? (
                <AvatarCrop src={cropSrc} onCrop={handleCropped} onCancel={() => setCropSrc(null)} />
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="avatar"
                        className="w-28 h-28 rounded-full object-cover border-4 border-[#00c875] shadow-md" />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#00c875] to-[#009660] flex items-center justify-center text-white text-4xl font-bold border-4 border-[#00c875] shadow-md">
                        {currentUser?.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#00c875] hover:bg-[#009660] text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]">
                      <Camera className="w-4 h-4" /> Choisir une photo
                    </button>
                    {currentUser?.avatarUrl && (
                      <button onClick={handleRemovePhoto}
                        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Supprimer la photo
                      </button>
                    )}
                  </div>
                  {photoSaved && (
                    <div className="flex items-center gap-2 text-green-700 text-sm justify-center">
                      <CheckCircle className="w-4 h-4" /> Photo mise à jour.
                    </div>
                  )}
                  <p className="text-xs text-gray-400 text-center">Formats acceptés : JPG, PNG, WebP. Taille recommandée : 400×400px.</p>
                </>
              )}
            </div>
          )}

          {/* Password tab */}
          {tab === 'password' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe <span className="text-gray-400 font-normal">(min. 8 car.)</span></label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                <button onClick={handleChangePassword}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors min-h-[44px]">
                  <Lock className="w-4 h-4" /> Changer le mot de passe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
