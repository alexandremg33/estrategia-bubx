import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Users, 
  Download, 
  Plus, 
  Search, 
  BrainCircuit, 
  Trash, 
  ChevronLeft, 
  ChevronRight,
  Save,
  Loader2
} from 'lucide-react';
import SpreadsheetRow from './components/SpreadsheetRow';
import { Participant } from './types';
import { analyzeParticipants, generateMessageForParticipant } from './services/geminiService';
import ReactMarkdown from 'react-markdown';

// Constants
const ITEMS_PER_PAGE = 20;
const TOTAL_INITIAL_ROWS = 1000;
const LOCAL_STORAGE_KEY = 'hubx_strategy_data';

const App: React.FC = () => {
  // State
  const [data, setData] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<{id: string, text: string} | null>(null);

  // Initialize Data
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        // Migration logic: Ensure all participants have 5 weeks
        const migratedData = parsedData.map((p: any) => {
            if (p.weeks && Array.isArray(p.weeks)) {
                // If we have less than 5 weeks, pad with false
                if (p.weeks.length < 5) {
                    const diff = 5 - p.weeks.length;
                    const padding = new Array(diff).fill(false);
                    return { ...p, weeks: [...p.weeks, ...padding] };
                }
                // If we have more than 5 (unlikely, but just in case), slice
                if (p.weeks.length > 5) {
                    return { ...p, weeks: p.weeks.slice(0, 5) };
                }
            }
            return p;
        });
        setData(migratedData);
      } catch (e) {
        console.error("Failed to load data", e);
        initializeEmptyData();
      }
    } else {
      initializeEmptyData();
    }
    setLoading(false);
  }, []);

  const initializeEmptyData = () => {
    // Initial load: Create 50 rows to start, users can add more.
    // Creating 1000 objects in memory is fine, rendering them all at once is the bottleneck.
    const initialRows: Participant[] = Array.from({ length: 50 }).map(() => ({
      id: uuidv4(),
      name: '',
      whatsapp: '',
      weeks: [false, false, false, false, false]
    }));
    setData(initialRows);
  };

  // Persist Data (Debounced roughly by just saving on specific actions or interval could be better, 
  // but for simplicity we save on effect with a small timeout or just manual save for massive lists)
  useEffect(() => {
    if (!loading) {
        const timeout = setTimeout(() => {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        }, 1000);
        return () => clearTimeout(timeout);
    }
  }, [data, loading]);

  // Handlers
  const handleUpdate = useCallback((id: string, field: keyof Participant | 'week', value: any, weekIndex?: number) => {
    setData(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'week' && typeof weekIndex === 'number') {
          const newWeeks = [...item.weeks] as [boolean, boolean, boolean, boolean, boolean];
          newWeeks[weekIndex] = value;
          return { ...item, weeks: newWeeks };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta linha?')) {
        setData(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const handleAddRow = () => {
    const newRow: Participant = {
      id: uuidv4(),
      name: '',
      whatsapp: '',
      weeks: [false, false, false, false, false]
    };
    // Add to beginning or end? Usually end for spreadsheets.
    setData(prev => [...prev, newRow]);
    // Jump to last page
    const newTotal = data.length + 1;
    setCurrentPage(Math.ceil(newTotal / ITEMS_PER_PAGE));
  };

  const handleClearEmpty = () => {
    if(window.confirm("Remover todas as linhas vazias?")) {
        setData(prev => prev.filter(p => p.name.trim() !== '' || p.whatsapp.trim() !== ''));
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    const result = await analyzeParticipants(data);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleGenerateMessage = async (participant: Participant) => {
    setGeneratedMessage(null); // Clear previous
    // Show a loading toast or modal would be ideal, but we'll use a simple alert for MVP or just setting state
    const msg = await generateMessageForParticipant(participant);
    setGeneratedMessage({ id: participant.id, text: msg });
  };

  // Filtering & Pagination
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(item => 
      item.name.toLowerCase().includes(lower) || 
      item.whatsapp.includes(lower)
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const active = data.filter(p => p.name || p.whatsapp);
    const totalWeeks = active.length * 5;
    const paidWeeks = active.reduce((acc, curr) => acc + curr.weeks.filter(Boolean).length, 0);
    const percentage = totalWeeks === 0 ? 0 : Math.round((paidWeeks / totalWeeks) * 100);
    return { count: active.length, percentage };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <Users size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Estratégia HUBX</h1>
                    <p className="text-xs text-slate-500 hidden sm:block">Planilha de Gestão Financeira</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                 <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Participantes</span>
                    <span className="text-sm font-bold text-slate-800">{stats.count} Ativos</span>
                </div>
                 <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Arrecadação</span>
                    <span className={`text-sm font-bold ${stats.percentage > 80 ? 'text-green-600' : 'text-orange-500'}`}>
                        {stats.percentage}% Pago
                    </span>
                </div>
                
                <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
                >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                    <span className="hidden sm:inline">IA Analisar</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou whatsapp..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm text-sm"
                />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <button onClick={handleAddRow} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium shadow-sm whitespace-nowrap">
                    <Plus size={16} />
                    Adicionar Linha
                </button>
                <button onClick={handleClearEmpty} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-medium shadow-sm whitespace-nowrap">
                    <Trash size={16} />
                    Limpar Vazios
                </button>
                <button 
                  onClick={() => alert("Função de exportação CSV seria implementada aqui.")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
                >
                    <Download size={16} />
                    Exportar
                </button>
            </div>
        </div>

        {/* AI Analysis Result Panel */}
        {analysisResult && (
            <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <BrainCircuit size={20} />
                    <h3 className="font-bold text-lg">Relatório de Estratégia</h3>
                </div>
                <div className="prose prose-sm prose-purple max-w-none text-slate-600">
                    <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
                <button 
                    onClick={() => setAnalysisResult(null)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"
                >
                    <span className="sr-only">Fechar</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}

        {/* Generated Message Modal (Simple inline implementation for speed) */}
        {generatedMessage && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Mensagem Sugerida</h3>
                    <div className="bg-slate-100 p-4 rounded-lg text-slate-700 text-sm mb-4 whitespace-pre-wrap">
                        {generatedMessage.text}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setGeneratedMessage(null)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                        >
                            Fechar
                        </button>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(generatedMessage.text);
                                alert("Copiado para área de transferência!");
                            }}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium"
                        >
                            Copiar Texto
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                <div className="w-12 text-center py-3">#</div>
                <div className="flex-1 px-3 py-3 border-r border-slate-200">Nome</div>
                <div className="w-40 md:w-48 px-3 py-3 border-r border-slate-200">WhatsApp</div>
                <div className="w-56 md:w-80 border-r border-slate-200 flex">
                   <div className="flex-1 text-center py-3 border-r border-slate-200 bg-slate-100">Sem 1</div>
                   <div className="flex-1 text-center py-3 border-r border-slate-200 bg-slate-100">Sem 2</div>
                   <div className="flex-1 text-center py-3 border-r border-slate-200 bg-slate-100">Sem 3</div>
                   <div className="flex-1 text-center py-3 border-r border-slate-200 bg-slate-100">Sem 4</div>
                   <div className="flex-1 text-center py-3 bg-slate-100">Sem 5</div>
                </div>
                <div className="w-24 text-center py-3">Status</div>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1 bg-white">
                {paginatedData.length > 0 ? (
                    paginatedData.map((participant, idx) => (
                        <SpreadsheetRow 
                            key={participant.id} 
                            index={(currentPage - 1) * ITEMS_PER_PAGE + idx}
                            participant={participant} 
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onGenerateMessage={handleGenerateMessage}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <p>Nenhum participante encontrado.</p>
                        <button onClick={handleAddRow} className="mt-2 text-blue-600 hover:underline">Adicionar novo</button>
                    </div>
                )}
                
                {/* Spacer to allow scrolling past bottom easily */}
                <div className="h-12"></div>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-2 flex items-center justify-between text-xs sm:text-sm">
                <div className="text-slate-500 pl-2">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} até {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length} registros
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="px-2 font-medium text-slate-700">
                        Página {currentPage} de {Math.max(1, totalPages)}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
        
        {/* Helper hint */}
        <div className="mt-2 text-center text-xs text-slate-400">
            Dica: Os dados são salvos automaticamente no seu navegador.
        </div>
      </main>
    </div>
  );
};

export default App;