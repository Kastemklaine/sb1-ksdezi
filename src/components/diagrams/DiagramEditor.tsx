import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { Download, Square, Diamond, Type, ArrowRight, Trash2, Save, X, FileImage, Loader2 } from 'lucide-react';

interface DiagramEditorInnerProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onClose?: () => void;
  onInsert?: (dataUrl: string) => Promise<void>;
}

let nodeIdCounter = 1;

function DiagramEditorInner({ initialNodes, initialEdges, onSave, onClose, onInsert }: DiagramEditorInnerProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [nodeColor, setNodeColor] = useState('#6366f1');
  const [inserting, setInserting] = useState(false);
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find max id to avoid collisions
    const maxId = initialNodes.reduce((max, n) => Math.max(max, parseInt(n.id) || 0), 0);
    nodeIdCounter = maxId + 1;
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: false }, eds)),
    []
  );

  const addNode = (shape: 'rectangle' | 'diamond' | 'text') => {
    const id = String(nodeIdCounter++);
    const viewport = reactFlow.getViewport();
    const x = (-viewport.x + 200) / viewport.zoom;
    const y = (-viewport.y + 200) / viewport.zoom;

    let style: React.CSSProperties = {
      background: nodeColor,
      color: '#fff',
      border: '2px solid #4338ca',
      borderRadius: shape === 'rectangle' ? '8px' : '0px',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
    };

    if (shape === 'diamond') {
      style = {
        ...style,
        transform: 'rotate(45deg)',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
      };
    }

    if (shape === 'text') {
      style = {
        background: 'transparent',
        color: '#1f2937',
        border: '2px dashed #d1d5db',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '14px',
      };
    }

    const newNode: Node = {
      id,
      position: { x, y },
      data: { label: shape === 'diamond' ? 'Décision' : shape === 'text' ? 'Texte' : 'Nœud' },
      style,
      type: 'default',
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const startEditing = (node: Node) => {
    setEditingNodeId(node.id);
    setEditLabel(String(node.data.label ?? ''));
  };

  const applyLabel = () => {
    if (!editingNodeId) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === editingNodeId ? { ...n, data: { ...n.data, label: editLabel } } : n))
    );
    setEditingNodeId(null);
  };

  const updateSelectedNodeColor = (color: string) => {
    setNodeColor(color);
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, style: { ...n.style, background: color } }
          : n
      )
    );
  };

  const handleInsertInDoc = async () => {
    if (!onInsert) return;
    const flowEl = containerRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null;
    const wrapper = containerRef.current?.querySelector('.react-flow__renderer') as HTMLElement | null;
    const target = wrapper ?? flowEl ?? containerRef.current;
    if (!target) return;
    setInserting(true);
    try {
      const dataUrl = await toPng(target, { backgroundColor: '#ffffff', pixelRatio: 2 });
      await onInsert(dataUrl);
    } catch {
      alert('Erreur lors de la génération du schéma.');
    } finally {
      setInserting(false);
    }
  };

  const handleExportPNG = async () => {
    const flowEl = containerRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null;
    const wrapper = containerRef.current?.querySelector('.react-flow__renderer') as HTMLElement | null;
    const target = wrapper ?? flowEl ?? containerRef.current;
    if (!target) return;
    try {
      const dataUrl = await toPng(target, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'schema.png';
      a.click();
    } catch {
      alert('Erreur lors de l\'export PNG. Essayez d\'exporter en SVG.');
    }
  };

  const handleExportSVG = () => {
    const svgEl = containerRef.current?.querySelector('.react-flow__edges svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !editingNodeId) {
      deleteSelected();
    }
  }, [selectedNodeId, editingNodeId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border-b border-gray-200 no-print shrink-0">
        <button
          onClick={() => addNode('rectangle')}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors touch-manipulation min-h-[36px]"
          title="Ajouter un rectangle"
        >
          <Square className="w-3 h-3" />
          Rect.
        </button>
        <button
          onClick={() => addNode('diamond')}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors touch-manipulation min-h-[36px]"
          title="Ajouter un losange (décision)"
        >
          <Diamond className="w-3 h-3" />
          Décision
        </button>
        <button
          onClick={() => addNode('text')}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors touch-manipulation min-h-[36px]"
          title="Ajouter un texte"
        >
          <Type className="w-3 h-3" />
          Texte
        </button>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowRight className="w-3 h-3" />
          <span className="hidden sm:inline">Glisser les poignées pour connecter</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedNodeId && (
            <>
              <label className="text-xs text-gray-500">Couleur :</label>
              <input
                type="color"
                value={nodeColor}
                onChange={e => updateSelectedNodeColor(e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                title="Couleur du nœud"
              />
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg transition-colors touch-manipulation min-h-[36px]"
                title="Supprimer (Delete)"
              >
                <Trash2 className="w-3 h-3" />
                Suppr.
              </button>
            </>
          )}
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors touch-manipulation min-h-[36px]"
          >
            <Download className="w-3 h-3" />
            PNG
          </button>
          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors touch-manipulation min-h-[36px]"
          >
            <Download className="w-3 h-3" />
            SVG
          </button>
          {onInsert && (
            <button
              onClick={handleInsertInDoc}
              disabled={inserting}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors touch-manipulation min-h-[36px]"
            >
              {inserting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileImage className="w-3 h-3" />}
              Insérer
            </button>
          )}
          <button
            onClick={() => onSave({ nodes, edges })}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors touch-manipulation min-h-[36px]"
          >
            <Save className="w-3 h-3" />
            Enregistrer
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Label editor */}
      {editingNodeId && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border-b border-yellow-200 shrink-0">
          <input
            autoFocus
            type="text"
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyLabel()}
            className="flex-1 border border-yellow-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Libellé du nœud"
          />
          <button onClick={applyLabel} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded transition-colors touch-manipulation min-h-[36px]">
            OK
          </button>
        </div>
      )}

      {/* React Flow canvas */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
          }}
          onNodeDoubleClick={(_, node) => {
            startEditing(node);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
          }}
          fitView
          deleteKeyCode={null} // We handle delete manually
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

export interface DiagramData {
  nodes: Node[];
  edges: Edge[];
}

interface Props {
  initialData?: DiagramData;
  onSave: (data: DiagramData) => void;
  onClose?: () => void;
  onInsert?: (dataUrl: string) => Promise<void>;
}

export default function DiagramEditor({ initialData, onSave, onClose, onInsert }: Props) {
  const defaultNodes: Node[] = initialData?.nodes ?? [];
  const defaultEdges: Edge[] = initialData?.edges ?? [];

  return (
    <ReactFlowProvider>
      <DiagramEditorInner
        initialNodes={defaultNodes}
        initialEdges={defaultEdges}
        onSave={onSave}
        onClose={onClose}
        onInsert={onInsert}
      />
    </ReactFlowProvider>
  );
}
