import { Printer, FileText } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';

export default function FinalDocumentView() {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const allDocuments = useProjectStore(s => curProject(s)?.documents ?? []);

  const handlePrint = () => {
    window.print();
  };

  const finalDocs = allDocuments.filter(d => d.space === 'final');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Dossier Final — Vue globale</h2>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation min-h-[44px]"
        >
          <Printer className="w-4 h-4" />
          Imprimer / PDF
        </button>
      </div>

      {workstreams.map(ws => {
        const wsDocs = finalDocs.filter(d => d.workstreamId === ws.id);
        if (wsDocs.length === 0) return null;

        const subSections = ws.subSections ?? [];

        return (
          <section key={ws.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 ${ws.color}`}>
              <h3 className={`text-lg font-bold ${ws.textColor}`}>{ws.name}</h3>
              {ws.description && <p className={`text-sm mt-0.5 opacity-80 ${ws.textColor}`}>{ws.description}</p>}
            </div>

            <div className="p-6 space-y-6">
              {/* Docs without sub-section */}
              {wsDocs.filter(d => !d.subSectionId).map(doc => (
                <article key={doc.id} className="border-l-4 border-green-400 pl-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{doc.title}</h4>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: doc.content }}
                  />
                </article>
              ))}

              {/* Docs grouped by sub-section */}
              {subSections.map(ss => {
                const ssDocs = wsDocs.filter(d => d.subSectionId === ss.id);
                if (ssDocs.length === 0) return null;
                return (
                  <div key={ss.id}>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
                      {ss.name}
                    </h4>
                    <div className="space-y-4">
                      {ssDocs.map(doc => (
                        <article key={doc.id} className="border-l-4 border-blue-300 pl-4">
                          <h5 className="font-semibold text-gray-800 mb-2">{doc.title}</h5>
                          <div
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: doc.content }}
                          />
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {finalDocs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun document final publié</p>
          <p className="text-xs mt-1">Les documents marqués comme &quot;Dossier Final&quot; dans les espaces de travail apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
