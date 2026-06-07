import { useState } from 'react';
import { Shield, Cookie, FileText, ChevronDown, ChevronUp, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

type Tab = 'mentions' | 'rgpd' | 'cookies';

export default function LegalView() {
  const [tab, setTab] = useState<Tab>('mentions');
  const [cookieOpen, setCookieOpen] = useState<string | null>(null);

  const tabBtn = (id: Tab, label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
        tab === id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const faq = (id: string, question: string, answer: React.ReactNode) => (
    <div key={id} className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setCookieOpen(cookieOpen === id ? null : id)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors min-h-[44px]"
      >
        {question}
        {cookieOpen === id ? <ChevronUp className="w-4 h-4 shrink-0 text-gray-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
      </button>
      {cookieOpen === id && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informations légales</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Site de gestion de projet — Ville à hauteur d'enfant ; handicaps — Quimperlé
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn('mentions', 'Mentions légales', FileText)}
        {tabBtn('rgpd', 'Protection des données', Shield)}
        {tabBtn('cookies', 'Cookies', Cookie)}
      </div>

      {/* ── MENTIONS LÉGALES ── */}
      {tab === 'mentions' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Éditeur du site
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-gray-700">
              <p className="font-semibold">Commune de Quimperlé</p>
              <p>32, rue de Pont-Aven</p>
              <p>29391 Quimperlé Cedex</p>
              <p className="mt-2">
                <span className="text-gray-500">SIRET :</span> 212 902 332 00015
              </p>
              <p>
                <span className="text-gray-500">Code INSEE :</span> 29233
              </p>
              <p>
                <span className="text-gray-500">Forme juridique :</span> Collectivité territoriale
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              Contact
            </h2>
            <div className="space-y-2 text-gray-700">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href="tel:+33298963737" className="hover:text-green-600 transition-colors">02 98 96 37 37</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href="mailto:mairie@ville-quimperle.fr" className="hover:text-green-600 transition-colors">mairie@ville-quimperle.fr</a>
              </p>
              <p className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href="https://www.quimperle.bzh" target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">www.quimperle.bzh</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Responsable de la publication</h2>
            <p className="text-gray-700">
              Le responsable de la publication est le Maire de Quimperlé, représentant légal de la Commune.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Hébergement</h2>
            <div className="bg-gray-50 rounded-xl p-4 text-gray-700 space-y-1">
              <p className="font-semibold">Google Firebase (Google LLC)</p>
              <p>1600 Amphitheatre Parkway</p>
              <p>Mountain View, CA 94043, États-Unis</p>
              <p className="mt-2 text-xs text-gray-500">
                Les données sont hébergées dans des centres de données situés en Europe (région europe-west) conformément aux exigences du RGPD.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Propriété intellectuelle</h2>
            <p className="text-gray-700">
              L'ensemble des contenus présents sur cette plateforme (textes, documents, schémas, images)
              sont la propriété exclusive de la Commune de Quimperlé ou de leurs auteurs respectifs,
              sauf mention contraire. Toute reproduction ou représentation, totale ou partielle,
              est interdite sans autorisation préalable de l'éditeur.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Limitation de responsabilité</h2>
            <p className="text-gray-700">
              Cette plateforme est réservée aux agents et partenaires désignés dans le cadre du projet
              municipal « Ville à hauteur d'enfant ; handicaps ». La Commune de Quimperlé ne saurait
              être tenue responsable des dommages directs ou indirects résultant d'une utilisation
              non conforme de cet outil.
            </p>
          </section>
        </div>
      )}

      {/* ── RGPD ── */}
      {tab === 'rgpd' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 text-sm leading-relaxed">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-xs">
            <p className="font-semibold mb-1">Base légale — Règlement (UE) 2016/679</p>
            <p>
              Le traitement de vos données personnelles est fondé sur la mission d'intérêt public
              confiée à la Commune de Quimperlé (article 6.1.e du RGPD), dans le cadre du projet
              « Ville à hauteur d'enfant ; handicaps ».
            </p>
          </div>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Responsable du traitement</h2>
            <div className="bg-gray-50 rounded-xl p-4 text-gray-700 space-y-1">
              <p className="font-semibold">Commune de Quimperlé</p>
              <p>32, rue de Pont-Aven — 29391 Quimperlé Cedex</p>
              <p className="flex items-center gap-2 mt-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <a href="mailto:mairie@ville-quimperle.fr" className="hover:text-green-600">mairie@ville-quimperle.fr</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Délégué à la protection des données (DPO)</h2>
            <p className="text-gray-700 mb-2">
              Conformément à l'article 37 du RGPD, la Commune de Quimperlé a désigné un Délégué
              à la protection des données. Pour toute question relative à la protection de vos données :
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-gray-700">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <a href="mailto:dpo@ville-quimperle.fr" className="hover:text-green-600">dpo@ville-quimperle.fr</a>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Ou par courrier : DPO — Mairie de Quimperlé, 32 rue de Pont-Aven, 29391 Quimperlé Cedex
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Données collectées</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 rounded-tl-lg">Donnée</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Finalité</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 rounded-tr-lg">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Nom, prénom', 'Identification dans la plateforme', '3 ans après fin du projet'],
                    ['Adresse e-mail', 'Authentification et notifications', '3 ans après fin du projet'],
                    ['Rôle et axes attribués', "Gestion des droits d'accès", '3 ans après fin du projet'],
                    ['Clé 2FA (hachée)', 'Sécurisation de la connexion', 'Supprimée à la désactivation'],
                    ['Contenus créés', 'Documents et tâches du projet', "Durée du projet + archivage légal"],
                    ['Journaux de connexion', 'Sécurité et traçabilité', '12 mois glissants'],
                  ].map(([d, f, c], i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{d}</td>
                      <td className="px-3 py-2 text-gray-600">{f}</td>
                      <td className="px-3 py-2 text-gray-600">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Vos droits</h2>
            <p className="text-gray-700 mb-3">
              Conformément au RGPD et à la loi Informatique et Libertés du 6 janvier 1978 modifiée,
              vous disposez des droits suivants sur vos données personnelles :
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['Droit d\'accès', 'Obtenir une copie de vos données'],
                ['Droit de rectification', 'Corriger des données inexactes'],
                ['Droit à l\'effacement', 'Demander la suppression de vos données'],
                ['Droit à la limitation', 'Restreindre certains traitements'],
                ['Droit d\'opposition', 'Vous opposer à un traitement'],
                ['Droit à la portabilité', 'Recevoir vos données dans un format structuré'],
              ].map(([titre, desc]) => (
                <div key={titre} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-800 text-xs">{titre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-3">
              Pour exercer ces droits, contactez le DPO à{' '}
              <a href="mailto:dpo@ville-quimperle.fr" className="text-green-600 hover:underline">dpo@ville-quimperle.fr</a>.
              En cas de litige, vous pouvez saisir la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">CNIL</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Transferts hors UE</h2>
            <p className="text-gray-700">
              L'hébergement Firebase (Google LLC) implique un transfert de données vers les États-Unis.
              Ce transfert est encadré par les Clauses Contractuelles Types de la Commission européenne
              et Google LLC est certifié au cadre EU-U.S. Data Privacy Framework.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Sécurité</h2>
            <p className="text-gray-700">
              La plateforme met en œuvre des mesures techniques et organisationnelles appropriées :
              chiffrement des données en transit (HTTPS/TLS), authentification à deux facteurs (2FA),
              gestion des droits d'accès par rôles, journalisation des connexions.
            </p>
          </section>
        </div>
      )}

      {/* ── COOKIES ── */}
      {tab === 'cookies' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 text-sm leading-relaxed">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-xs">
            <p className="font-semibold mb-1">Politique simplifiée</p>
            <p>
              Cette plateforme est un outil interne à accès restreint. Elle utilise uniquement
              des cookies et stockages locaux strictement nécessaires à son fonctionnement.
              Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </div>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Cookies et stockage local utilisés</h2>
            <div className="space-y-2">
              {faq('auth', 'auth-store (localStorage) — Session utilisateur', (
                <p>Stocke les informations de session (identifiant, rôle, préférences 2FA) pour maintenir votre connexion entre les visites. Durée : persistant jusqu'à déconnexion. Aucune donnée sensible n'est stockée en clair.</p>
              ))}
              {faq('project', 'project-store-v2 (localStorage) — Données du projet', (
                <p>Stocke les données du projet (tâches, axes, documents) localement pour permettre un accès hors-ligne partiel et améliorer les performances. Ces données sont également synchronisées avec Firebase.</p>
              ))}
              {faq('fontsize', 'font-size-pref (localStorage) — Préférence d\'affichage', (
                <p>Mémorise votre préférence de taille de police (petite / normale / grande) pour personnaliser votre expérience de lecture. Aucune donnée personnelle.</p>
              ))}
              {faq('firebase', 'Cookies Firebase Authentication', (
                <p>Firebase utilise des cookies de session sécurisés (HttpOnly, Secure, SameSite=Strict) pour maintenir l'authentification. Ces cookies sont strictement nécessaires et ne peuvent pas être désactivés sans rendre la plateforme inutilisable.</p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Cookies absents de cette plateforme</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['Google Analytics / Matomo', 'Aucun outil de statistiques web'],
                ['Publicité / retargeting', 'Aucune régie publicitaire'],
                ['Réseaux sociaux', 'Aucun bouton de partage avec tracking'],
                ['Hotjar / heatmaps', 'Aucun outil d\'analyse comportementale'],
              ].map(([titre, desc]) => (
                <div key={titre} className="flex items-start gap-2 bg-red-50 rounded-lg p-3">
                  <span className="text-red-500 text-base leading-none mt-0.5">✕</span>
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{titre}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Gestion des cookies</h2>
            <p className="text-gray-700 mb-2">
              Les cookies utilisés étant strictement nécessaires au fonctionnement de la plateforme,
              leur désactivation empêcherait l'accès au service. Vous pouvez néanmoins gérer vos
              cookies via les paramètres de votre navigateur :
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {[
                ['Microsoft Edge', 'Paramètres → Confidentialité, recherche et services → Cookies'],
                ['Google Chrome', 'Paramètres → Confidentialité et sécurité → Cookies'],
                ['Mozilla Firefox', 'Paramètres → Vie privée et sécurité → Cookies'],
                ['Apple Safari', 'Préférences → Confidentialité → Gérer les données de sites web'],
              ].map(([nav, chemin]) => (
                <div key={nav} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-800">{nav}</p>
                  <p className="text-gray-500 mt-0.5">{chemin}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-700">
              Pour toute question relative à notre politique de cookies, contactez le DPO de la Commune de Quimperlé :{' '}
              <a href="mailto:dpo@ville-quimperle.fr" className="text-green-600 hover:underline">dpo@ville-quimperle.fr</a>
            </p>
            <p className="text-gray-400 text-xs mt-3">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
