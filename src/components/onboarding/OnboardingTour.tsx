import { useState } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenue dans votre outil de gestion de projet !',
    desc: 'Cette application vous aide à piloter votre projet collectif de A à Z : tâches, gouvernance, documents, agenda et bien plus.',
  },
  {
    emoji: '🗂️',
    title: 'Naviguez avec la barre latérale',
    desc: 'Le menu à gauche donne accès à toutes les sections : Tableau de bord, Axes du projet, Agenda, Espaces de travail, Planning Gantt, et plus.',
  },
  {
    emoji: '✅',
    title: 'Créez et suivez des tâches',
    desc: 'Dans chaque axe du projet, créez des tâches, assignez-les à des membres, fixez des priorités (Haute / Normale / Basse) et suivez leur avancement.',
  },
  {
    emoji: '🤝',
    title: 'Collaborez en équipe',
    desc: 'Chaque tâche dispose d\'un fil de commentaires, d\'une checklist et d\'un espace pour joindre des fichiers. La messagerie interne permet de communiquer avec toute l\'équipe.',
  },
  {
    emoji: '📊',
    title: 'Suivez l\'avancement en temps réel',
    desc: 'Le tableau de bord affiche la progression globale, les tâches en retard et les prochaines échéances. Le Planning Gantt donne une vue chronologique complète.',
  },
];

interface Props {
  onClose: () => void;
}

export default function OnboardingTour({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleClose = () => {
    localStorage.setItem('onboarding-seen-v1', '1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-[#00c875]' : i < step ? 'w-4 bg-green-200' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 py-8 text-center space-y-4">
          <div className="text-5xl mb-2">{current.emoji}</div>
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.desc}</p>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button onClick={handleClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Passer
          </button>
          <button
            onClick={() => { if (isLast) handleClose(); else setStep(s => s + 1); }}
            className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {isLast ? (
              <><CheckCircle2 className="w-4 h-4" /> C'est parti !</>
            ) : (
              <>Suivant <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
