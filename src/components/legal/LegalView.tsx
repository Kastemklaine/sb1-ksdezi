import { Shield, Cookie, FileText } from 'lucide-react';
import { useState } from 'react';

type Tab = 'mentions' | 'donnees' | 'cookies';

export default function LegalView() {
  const [tab, setTab] = useState<Tab>('mentions');

  const tabBtn = (id: Tab, label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
        tab === id ? 'bg-[#00c875] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informations légales</h1>
        <p className="text-gray-500 mt-1 text-sm">Plateforme interne — Projet's ma Ville</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn('mentions', 'Mentions légales', FileText)}
        {tabBtn('donnees', 'Données personnelles', Shield)}
        {tabBtn('cookies', 'Cookies', Cookie)}
      </div>

      {tab === 'mentions' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 text-sm leading-relaxed text-gray-700">
          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Éditeur</h2>
            <p>
              Ce site a été développé à titre personnel dans le cadre d'un usage interne strictement limité
              aux personnes autorisées par l'éditeur. Il ne constitue pas un service public en ligne.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Hébergement</h2>
            <p>
              <strong>Google Firebase Hosting</strong> — Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, États-Unis.
              Les fichiers statiques (HTML, CSS, JS) sont servis via Firebase. Aucune donnée utilisateur
              n'est stockée sur les serveurs Firebase — tout est conservé localement dans votre navigateur (localStorage).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Accès</h2>
            <p>
              L'accès à cette plateforme est restreint par identifiant et mot de passe.
              Toute utilisation non autorisée est interdite.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Responsabilité</h2>
            <p>
              L'éditeur ne saurait être tenu responsable de tout dommage résultant
              d'une utilisation non conforme de cet outil ou d'une perte de données liée
              à la suppression du cache du navigateur.
            </p>
          </section>
        </div>
      )}

      {tab === 'donnees' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 text-sm leading-relaxed text-gray-700">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs">
            <p className="font-semibold mb-1">Outil interne — usage restreint</p>
            <p>
              Cette plateforme est réservée à un usage professionnel interne.
              Les données saisies ne sont pas destinées au public.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Où sont stockées vos données ?</h2>
            <p>
              Toutes les données (comptes, tâches, messages, documents) sont stockées
              <strong> uniquement dans le navigateur de chaque utilisateur</strong> (localStorage).
              Elles ne transitent par aucun serveur externe — aucune base de données distante n'est utilisée.
            </p>
            <p>
              Les messages et échanges sont <strong>chiffrés (AES-GCM 256 bits)</strong> avant d'être
              sauvegardés localement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Données collectées</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Nom et adresse e-mail (pour l'identification)</li>
              <li>Rôle et axes attribués (pour les droits d'accès)</li>
              <li>Contenu créé dans l'outil (tâches, notes, messages)</li>
              <li>Clé d'authentification 2FA si activée</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Conservation</h2>
            <p>
              Les données persistent dans votre navigateur jusqu'à ce que vous vidiez le cache ou
              que l'administrateur supprime votre compte. Elles disparaissent immédiatement si vous
              effacez les données de navigation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Vos droits</h2>
            <p>
              Pour toute demande de suppression ou de modification de vos données,
              contactez l'administrateur de la plateforme.
            </p>
          </section>
        </div>
      )}

      {tab === 'cookies' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 text-sm leading-relaxed text-gray-700">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-xs">
            <p className="font-semibold mb-1">Aucun cookie de tracking</p>
            <p>Cette plateforme n'utilise aucun cookie publicitaire, analytique ou de réseaux sociaux.</p>
          </div>

          <section className="space-y-3">
            <h2 className="font-bold text-gray-900">Stockages locaux utilisés</h2>
            {[
              ['auth-store', 'Session utilisateur (identifiant, rôle, préférences)', 'Jusqu\'à déconnexion'],
              ['project-store-v2', 'Données du projet (tâches, axes, messages chiffrés)', 'Persistant'],
              ['ia-store-v1', 'Configuration IA locale (provider, modèle, clé API)', 'Persistant'],
              ['font-size-pref', 'Préférence de taille de police', 'Persistant'],
            ].map(([clé, desc, durée]) => (
              <div key={clé} className="bg-gray-50 rounded-lg p-3">
                <p className="font-mono text-xs font-semibold text-gray-800">{clé}</p>
                <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                <p className="text-xs text-gray-400 mt-0.5">Durée : {durée}</p>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900">Supprimer les données locales</h2>
            <p className="text-gray-600">
              Via les paramètres de votre navigateur → Confidentialité → Effacer les données de navigation → Stockage local.
            </p>
            <p className="text-amber-600 text-xs font-medium">
              ⚠️ Attention : effacer le localStorage supprime définitivement toutes les données du projet stockées sur cet appareil.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
