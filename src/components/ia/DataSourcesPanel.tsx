import { useState } from 'react';
import { Database, Search, X, Loader2, Globe, ExternalLink, BookOpen, FlaskConical, Heart, Code2, Brain, Building2 } from 'lucide-react';

export interface DataResult {
  id: string;
  title: string;
  description?: string;
  url?: string;
  authors?: string;
  source: string;
  organization?: string;
  importContent: string; // full text to import as knowledge doc
}

type SourceId = 'datagouv' | 'culture' | 'insee' | 'anct' | 'eurostat' | 'worldbank' | 'hal' | 'arxiv' | 'pubmed' | 'huggingface' | 'kaggle';

const SOURCES: Array<{
  id: SourceId;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
  externalSearchUrl?: (q: string) => string;
}> = [
  { id: 'datagouv', name: 'data.gouv.fr', icon: Globe, color: 'blue', description: 'Données publiques françaises' },
  { id: 'culture', name: 'Min. Culture', icon: Building2, color: 'violet', description: 'Ministère de la Culture — data.culture.gouv.fr' },
  { id: 'insee', name: 'INSEE', icon: Building2, color: 'orange', description: 'Institut National de la Statistique et des Études Économiques' },
  { id: 'anct', name: 'ANCT', icon: Globe, color: 'green', description: 'Agence Nationale de la Cohésion des Territoires', externalSearchUrl: q => `https://agence-cohesion-territoires.gouv.fr/recherche?keys=${encodeURIComponent(q)}` },
  { id: 'eurostat', name: 'Eurostat', icon: Building2, color: 'sky', description: 'Statistiques de l\'Union européenne', externalSearchUrl: q => `https://ec.europa.eu/eurostat/web/main/search/-/search/estatsearchportlet_WAR_estatsearchportlet?text=${encodeURIComponent(q)}` },
  { id: 'worldbank', name: 'World Bank', icon: Globe, color: 'emerald', description: 'Banque Mondiale — données mondiales' },
  { id: 'hal', name: 'HAL', icon: BookOpen, color: 'indigo', description: 'Articles scientifiques en libre accès (FR)' },
  { id: 'arxiv', name: 'arXiv', icon: FlaskConical, color: 'red', description: 'Prépublications scientifiques' },
  { id: 'pubmed', name: 'PubMed', icon: Heart, color: 'rose', description: 'Recherche biomédicale (NCBI)' },
  { id: 'huggingface', name: 'Hugging Face', icon: Brain, color: 'amber', description: 'Datasets IA / Machine Learning' },
  { id: 'kaggle', name: 'Kaggle', icon: Code2, color: 'cyan', description: 'Datasets et compétitions data science', externalSearchUrl: q => `https://www.kaggle.com/search?q=${encodeURIComponent(q)}+in%3Adatasets` },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; btn: string; ring: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700', ring: 'ring-blue-400' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', btn: 'bg-violet-600 hover:bg-violet-700', ring: 'ring-violet-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', btn: 'bg-orange-600 hover:bg-orange-700', ring: 'ring-orange-400' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', btn: 'bg-green-600 hover:bg-green-700', ring: 'ring-green-400' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', btn: 'bg-sky-600 hover:bg-sky-700', ring: 'ring-sky-400' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700', ring: 'ring-emerald-400' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'ring-indigo-400' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', btn: 'bg-red-600 hover:bg-red-700', ring: 'ring-red-400' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', btn: 'bg-rose-600 hover:bg-rose-700', ring: 'ring-rose-400' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', btn: 'bg-amber-600 hover:bg-amber-700', ring: 'ring-amber-400' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', btn: 'bg-cyan-600 hover:bg-cyan-700', ring: 'ring-cyan-400' },
};

// ---- Search implementations ----

async function searchDataGouv(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query)}&page_size=8&sort=-created`
  );
  if (!res.ok) throw new Error(`data.gouv.fr: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map((ds: any) => ({
    id: `datagouv-${ds.id}`,
    title: ds.title,
    description: ds.description?.slice(0, 250),
    url: ds.page,
    organization: ds.organization?.name,
    source: 'data.gouv.fr',
    importContent: `Source : data.gouv.fr\nURL : ${ds.page}\nOrganisation : ${ds.organization?.name ?? 'Non précisée'}\nMots-clés : ${(ds.tags ?? []).join(', ')}\n\nDescription :\n${ds.description ?? ''}`,
  }));
}

async function searchWorldBank(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://search.worldbank.org/api/v2/wds?format=json&qterm=${encodeURIComponent(query)}&rows=8&fl=docdt,docna,abstracts,url,owner`
  );
  if (!res.ok) throw new Error(`World Bank: ${res.status}`);
  const json = await res.json();
  const docs = json.documents ?? {};
  return Object.entries(docs).filter(([k]) => k !== 'facets').map(([id, doc]: [string, any]) => ({
    id: `wb-${id}`,
    title: doc.docna ?? doc.display_title ?? 'Sans titre',
    description: doc.abstracts ?? '',
    url: doc.url ?? doc.pdfurl,
    organization: doc.owner ?? 'World Bank',
    source: 'World Bank',
    importContent: `Source : World Bank Open Data\nURL : ${doc.url ?? doc.pdfurl ?? ''}\nDate : ${doc.docdt ?? 'Non précisée'}\n\nTitre : ${doc.docna ?? ''}\n\nRésumé :\n${doc.abstracts ?? 'Pas de résumé disponible.'}`,
  })).slice(0, 8);
}

async function searchHAL(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(query)}&fl=docid,title_s,abstract_s,authFullName_s,producedDateY_i,uri_s,journalTitle_s&wt=json&rows=8`
  );
  if (!res.ok) throw new Error(`HAL: ${res.status}`);
  const json = await res.json();
  return (json.response?.docs ?? []).map((d: any) => ({
    id: `hal-${d.docid}`,
    title: Array.isArray(d.title_s) ? d.title_s[0] : (d.title_s ?? 'Sans titre'),
    description: Array.isArray(d.abstract_s) ? d.abstract_s[0]?.slice(0, 300) : (d.abstract_s?.slice(0, 300) ?? ''),
    url: d.uri_s,
    authors: (d.authFullName_s ?? []).slice(0, 4).join(', '),
    organization: d.journalTitle_s,
    source: 'HAL',
    importContent: `Source : HAL (Hyper Article en Ligne)\nURL : ${d.uri_s ?? ''}\nAnnée : ${d.producedDateY_i ?? '?'}\nAuteurs : ${(d.authFullName_s ?? []).join(', ')}\nRevue : ${d.journalTitle_s ?? 'Non précisée'}\n\nTitre : ${Array.isArray(d.title_s) ? d.title_s[0] : d.title_s}\n\nRésumé :\n${Array.isArray(d.abstract_s) ? d.abstract_s[0] : (d.abstract_s ?? 'Pas de résumé.')}`,
  }));
}

async function searchArxiv(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=8`
  );
  if (!res.ok) throw new Error(`arXiv: ${res.status}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const entries = Array.from(doc.querySelectorAll('entry'));
  return entries.map((e, i) => {
    const title = e.querySelector('title')?.textContent?.trim() ?? 'Sans titre';
    const summary = e.querySelector('summary')?.textContent?.trim() ?? '';
    const id = e.querySelector('id')?.textContent ?? `arxiv-${i}`;
    const authors = Array.from(e.querySelectorAll('author > name')).map(n => n.textContent).filter(Boolean).join(', ');
    const published = e.querySelector('published')?.textContent?.slice(0, 10) ?? '';
    return {
      id: `arxiv-${id}`,
      title,
      description: summary.slice(0, 250),
      url: id,
      authors,
      source: 'arXiv',
      importContent: `Source : arXiv\nURL : ${id}\nDate : ${published}\nAuteurs : ${authors}\n\nTitre : ${title}\n\nRésumé :\n${summary}`,
    };
  });
}

async function searchPubMed(query: string): Promise<DataResult[]> {
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=8&sort=relevance`
  );
  if (!searchRes.ok) throw new Error(`PubMed search: ${searchRes.status}`);
  const searchJson = await searchRes.json();
  const ids: string[] = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const summaryRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
  );
  if (!summaryRes.ok) throw new Error(`PubMed summary: ${summaryRes.status}`);
  const summaryJson = await summaryRes.json();
  const result = summaryJson.result ?? {};
  return ids.map(id => {
    const a = result[id];
    if (!a) return null;
    const authors = (a.authors ?? []).slice(0, 4).map((x: any) => x.name).join(', ');
    const url = `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
    return {
      id: `pubmed-${id}`,
      title: a.title ?? 'Sans titre',
      description: `${a.fulljournalname ?? a.source ?? ''} — ${a.pubdate ?? ''}`,
      url,
      authors,
      organization: a.fulljournalname ?? a.source,
      source: 'PubMed',
      importContent: `Source : PubMed (NCBI)\nURL : ${url}\nPubMed ID : ${id}\nRevue : ${a.fulljournalname ?? a.source ?? ''}\nDate : ${a.pubdate ?? ''}\nAuteurs : ${(a.authors ?? []).map((x: any) => x.name).join(', ')}\n\nTitre : ${a.title}\n\nPour le texte complet, consulter : ${url}`,
    };
  }).filter(Boolean) as DataResult[];
}

async function searchHuggingFace(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=8`
  );
  if (!res.ok) throw new Error(`Hugging Face: ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map((d: any) => ({
    id: `hf-${d.id}`,
    title: d.id,
    description: d.description?.slice(0, 250) ?? `Dataset Hugging Face — ${d.downloads ?? 0} téléchargements`,
    url: `https://huggingface.co/datasets/${d.id}`,
    organization: d.author,
    source: 'Hugging Face',
    importContent: `Source : Hugging Face Datasets\nURL : https://huggingface.co/datasets/${d.id}\nAuteur : ${d.author ?? 'Inconnu'}\nTéléchargements : ${d.downloads ?? 0}\nLikes : ${d.likes ?? 0}\nTags : ${(d.tags ?? []).slice(0, 10).join(', ')}\n\nNom : ${d.id}\n\nDescription :\n${d.description ?? 'Pas de description.'}`,
  }));
}

async function searchEurostat(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT?lang=fr&detail=allstubs&format=JSON`
  );
  if (!res.ok) throw new Error(`Eurostat: ${res.status}`);
  const json = await res.json();
  const flows = json?.data?.dataflows ?? json?.dataflows ?? [];
  const q = query.toLowerCase();
  return flows
    .filter((f: any) => {
      const name = (f.name ?? '').toLowerCase();
      const id = (f.id ?? '').toLowerCase();
      return name.includes(q) || id.includes(q);
    })
    .slice(0, 8)
    .map((f: any) => {
      const url = `https://ec.europa.eu/eurostat/databrowser/view/${f.id}/default/table?lang=fr`;
      return {
        id: `eurostat-${f.id}`,
        title: f.name ?? f.id,
        description: `Code dataset : ${f.id}`,
        url,
        organization: 'Eurostat',
        source: 'Eurostat',
        importContent: `Source : Eurostat\nURL : ${url}\nCode dataset : ${f.id}\n\nTitre : ${f.name}\n\nPour consulter les données détaillées, ouvrir le lien ci-dessus.`,
      };
    });
}

async function searchCulture(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://data.culture.gouv.fr/api/explore/v2.1/catalog/datasets?where=${encodeURIComponent(query)}&limit=8&lang=fr`
  );
  if (!res.ok) throw new Error(`data.culture.gouv.fr: ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((d: any) => ({
    id: `culture-${d.dataset_id}`,
    title: d.metas?.default?.title ?? d.dataset_id ?? 'Sans titre',
    description: d.metas?.default?.description?.slice(0, 250),
    url: `https://data.culture.gouv.fr/explore/dataset/${d.dataset_id}/`,
    organization: d.metas?.default?.publisher ?? 'Ministère de la Culture',
    source: 'Min. Culture',
    importContent: `Source : Ministère de la Culture (data.culture.gouv.fr)\nURL : https://data.culture.gouv.fr/explore/dataset/${d.dataset_id}/\nÉditeur : ${d.metas?.default?.publisher ?? 'Non précisé'}\nThèmes : ${(d.metas?.default?.theme ?? []).join(', ')}\n\nTitre : ${d.metas?.default?.title ?? d.dataset_id}\n\nDescription :\n${d.metas?.default?.description ?? 'Pas de description.'}`,
  }));
}

async function searchINSEE(query: string): Promise<DataResult[]> {
  const res = await fetch(
    `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query + ' insee')}&organization=534fff81a3a7292c64a77e5c&page_size=8&sort=-created`
  );
  if (!res.ok) throw new Error(`INSEE via data.gouv.fr: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map((ds: any) => ({
    id: `insee-${ds.id}`,
    title: ds.title,
    description: ds.description?.slice(0, 250),
    url: ds.page,
    organization: 'INSEE',
    source: 'INSEE',
    importContent: `Source : INSEE (via data.gouv.fr)\nURL : ${ds.page}\nMots-clés : ${(ds.tags ?? []).join(', ')}\n\nTitre : ${ds.title}\n\nDescription :\n${ds.description ?? ''}`,
  }));
}

async function performSearch(source: SourceId, query: string): Promise<DataResult[]> {
  switch (source) {
    case 'datagouv': return searchDataGouv(query);
    case 'culture': return searchCulture(query);
    case 'insee': return searchINSEE(query);
    case 'anct': return []; // external only — links to ANCT website
    case 'worldbank': return searchWorldBank(query);
    case 'hal': return searchHAL(query);
    case 'arxiv': return searchArxiv(query);
    case 'pubmed': return searchPubMed(query);
    case 'huggingface': return searchHuggingFace(query);
    case 'eurostat': return searchEurostat(query);
    case 'kaggle': return []; // external only
    default: return [];
  }
}

// ---- Component ----
interface Props {
  onClose: () => void;
  onImport: (doc: { title: string; content: string }) => void;
}

export default function DataSourcesPanel({ onClose, onImport }: Props) {
  const [source, setSource] = useState<SourceId>('datagouv');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DataResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const sourceMeta = SOURCES.find(s => s.id === source)!;
  const colors = COLOR_MAP[sourceMeta.color];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const r = await performSearch(source, query.trim());
      setResults(r);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (r: DataResult) => {
    setImportingId(r.id);
    onImport({ title: r.title, content: r.importContent });
    setTimeout(() => setImportingId(null), 600);
  };

  const switchSource = (id: SourceId) => {
    setSource(id);
    setResults([]);
    setError(null);
  };

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Database className={`w-4 h-4 ${colors.text}`} />
        <p className={`text-sm font-semibold ${colors.text}`}>Bases de données externes</p>
        <button onClick={onClose} className={`ml-auto p-1 ${colors.text} opacity-60 hover:opacity-100`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Source selector */}
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map(s => {
          const Icon = s.icon;
          const active = source === s.id;
          const c = COLOR_MAP[s.color];
          return (
            <button
              key={s.id}
              onClick={() => switchSource(s.id)}
              title={s.description}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active ? `${c.btn} text-white shadow-sm` : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.name}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 mt-1 italic">{sourceMeta.description}</p>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={`Rechercher sur ${sourceMeta.name}…`}
          className={`flex-1 border ${colors.border} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} bg-white`}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className={`flex items-center gap-2 px-3 py-2 ${colors.btn} disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors min-h-[40px]`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Chercher
        </button>
        {sourceMeta.externalSearchUrl && (
          <a
            href={sourceMeta.externalSearchUrl(query || '')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors min-h-[40px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Site
          </a>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
          {error}
        </div>
      )}

      {/* External-only notices */}
      {source === 'kaggle' && !loading && (
        <div className="bg-white border border-cyan-200 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-medium text-cyan-700 mb-1">Kaggle nécessite une authentification API.</p>
          <p>Cliquez sur "Site" pour rechercher sur Kaggle, puis collez l'URL et le titre via "Texte libre".</p>
        </div>
      )}
      {source === 'anct' && !loading && (
        <div className="bg-white border border-green-200 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-medium text-green-700 mb-1">ANCT — Agence Nationale de la Cohésion des Territoires</p>
          <p>Cliquez sur "Site" pour accéder aux publications et rapports de l'ANCT, puis importez via "Texte libre".</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{r.title}</p>
                {r.authors && <p className="text-xs text-gray-500 mt-0.5 italic">{r.authors}</p>}
                {r.organization && <p className={`text-xs ${colors.text} mt-0.5`}>{r.organization}</p>}
                {r.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                )}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Voir la source
                  </a>
                )}
              </div>
              <button
                onClick={() => handleImport(r)}
                disabled={importingId === r.id}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 ${colors.btn} disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors min-h-[36px]`}
              >
                {importingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Importer
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && !error && source !== 'kaggle' && source !== 'anct' && (
        <p className={`text-xs ${colors.text} text-center py-2`}>Aucun résultat — essayez d'autres mots-clés</p>
      )}
    </div>
  );
}
