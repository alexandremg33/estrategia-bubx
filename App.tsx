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
  Loader2,
  Sparkles
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
    const initialRows: Participant[] = Array.from({ length: 50 }).map(() => ({
      id: uuidv4(),
      name: '',
      whatsapp: '',
      weeks: [false, false, false, false, false]
    }));
    setData(initialRows);
  };

  // Persist Data 
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
    setData(prev => [...prev, newRow]);
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

  if (loading) return <div className="flex items-center justify-center h-screen bg-indigo-50"><Loader2 className="animate-spin text-purple-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-indigo-50/50 flex flex-col text-slate-900 font-sans">
      
      {/* Navbar - Vivid Gradient */}
      <header className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-18 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl text-white shadow-inner">
                    <Sparkles size={24} className="text-yellow-300" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">Estratégia HUBX</h1>
                    <p className="text-xs text-indigo-100 font-medium opacity-90">Gestão de Pagamentos</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <div className="hidden md:flex flex-col items-end mr-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider">Participantes</span>
                    <span className="text-lg font-bold text-white">{stats.count}</span>
                </div>
                 <div className="hidden md:flex flex-col items-end mr-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider">Arrecadação</span>
                    <span className={`text-lg font-bold ${stats.percentage > 80 ? 'text-emerald-300' : 'text-yellow-300'}`}>
                        {stats.percentage}%
                    </span>
                </div>
                
                <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 rounded-full hover:bg-violet-50 hover:shadow-lg transition-all text-sm font-bold shadow-md disabled:opacity-70 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                    <span className="hidden sm:inline">IA Analisar</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-violet-600 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou whatsapp..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 outline-none shadow-sm text-sm transition-all text-slate-700"
                />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <button onClick={handleAddRow} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors text-sm font-semibold shadow-md shadow-violet-200 whitespace-nowrap">
                    <Plus size={18} />
                    Adicionar
                </button>
                <button onClick={handleClearEmpty} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-colors text-sm font-medium shadow-sm whitespace-nowrap">
                    <Trash size={18} />
                    Limpar
                </button>
                <button 
                  onClick={() => alert("Função de exportação CSV seria implementada aqui.")}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
                >
                    <Download size={18} />
                    Exportar
                </button>
            </div>
        </div>

        {/* AI Analysis Result Panel */}
        {analysisResult && (
            <div className="mb-6 bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-lg border border-purple-100 relative animate-in fade-in slide-in-from-top-4 duration-500 ring-1 ring-purple-100">
                <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <div className="bg-purple-100 p-2 rounded-lg">
                        <BrainCircuit size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Insights da Inteligência Artificial</h3>
                </div>
                <div className="prose prose-sm prose-purple max-w-none text-slate-600 bg-white/50 p-4 rounded-xl border border-purple-100/50">
                    <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
                <button 
                    onClick={() => setAnalysisResult(null)}
                    className="absolute top-4 right-4 text-purple-300 hover:text-purple-500 transition-colors"
                >
                    <span className="sr-only">Fechar</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}

        {/* Generated Message Modal */}
        {generatedMessage && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-200 border border-white/20">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="text-2xl">💬</span> Sugestão de Mensagem
                    </h3>
                    <div className="bg-indigo-50 p-5 rounded-xl text-slate-700 text-sm mb-6 whitespace-pre-wrap border border-indigo-100 leading-relaxed shadow-inner">
                        {generatedMessage.text}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setGeneratedMessage(null)}
                            className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(generatedMessage.text);
                                alert("Copiado para área de transferência!");
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 rounded-xl text-sm font-bold shadow-md transform hover:-translate-y-0.5 transition-all"
                        >
                            Copiar Texto
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100 flex flex-col flex-1 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center bg-indigo-50/80 border-b border-indigo-100 text-xs font-bold text-indigo-800 uppercase tracking-wider select-none backdrop-blur-sm">
                <div className="w-12 text-center py-4 text-indigo-400">#</div>
                <div className="flex-1 px-4 py-4 border-r border-orange-300">Participante</div>
                <div className="w-40 md:w-48 px-4 py-4 border-r border-orange-300">WhatsApp</div>
                <div className="w-56 md:w-80 border-r border-orange-300 flex">
                   <div className="flex-1 text-center py-4 border-r border-orange-300">Sem 1</div>
                   <div className="flex-1 text-center py-4 border-r border-orange-300">Sem 2</div>
                   <div className="flex-1 text-center py-4 border-r border-orange-300">Sem 3</div>
                   <div className="flex-1 text-center py-4 border-r border-orange-300">Sem 4</div>
                   <div className="flex-1 text-center py-4">Sem 5</div>
                </div>
                <div className="w-24 text-center py-4">Status</div>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1 bg-white custom-scrollbar">
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
                    <div className="flex flex-col items-center justify-center h-64 text-indigo-300">
                        <Users size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Nenhum participante encontrado.</p>
                        <button onClick={handleAddRow} className="mt-2 text-violet-600 hover:text-violet-800 font-semibold underline decoration-2 decoration-violet-200 hover:decoration-violet-500 transition-all">Adicionar novo participante</button>
                    </div>
                )}
                
                {/* Spacer */}
                <div className="h-12 bg-gradient-to-t from-white to-transparent"></div>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-indigo-100 bg-indigo-50/50 p-3 flex items-center justify-between text-xs sm:text-sm">
                <div className="text-indigo-600 pl-2 font-medium">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de <span className="font-bold">{filteredData.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-white text-indigo-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm disabled:shadow-none"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="px-3 py-1 bg-white rounded-lg shadow-sm font-bold text-indigo-800 border border-indigo-100">
                        {currentPage} / {Math.max(1, totalPages)}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded-lg hover:bg-white text-indigo-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm disabled:shadow-none"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
        
        {/* Helper hint */}
        <div className="mt-3 text-center text-xs font-medium text-indigo-300">
            Dica: Seus dados são salvos automaticamente no navegador.
        </div>
      </main>
    </div>
  );
};

export default App;