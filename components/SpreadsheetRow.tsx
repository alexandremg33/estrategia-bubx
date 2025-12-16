import React, { memo } from 'react';
import { Participant } from '../types';
import { Check, X, MessageCircle, Trash2 } from 'lucide-react';

interface SpreadsheetRowProps {
  participant: Participant;
  index: number;
  onUpdate: (id: string, field: keyof Participant | 'week', value: any, weekIndex?: number) => void;
  onDelete: (id: string) => void;
  onGenerateMessage: (participant: Participant) => void;
}

const SpreadsheetRow: React.FC<SpreadsheetRowProps> = ({ 
  participant, 
  index, 
  onUpdate, 
  onDelete,
  onGenerateMessage
}) => {
  const isComplete = participant.weeks.every(w => w);
  const isEmpty = !participant.name && !participant.whatsapp;

  return (
    <div className={`flex items-center border-b border-indigo-50 hover:bg-violet-50/60 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-indigo-50/30'}`}>
      {/* Index */}
      <div className="w-12 flex-shrink-0 text-center text-xs font-medium text-indigo-300 py-3 select-none">
        {index + 1}
      </div>

      {/* Name Input */}
      <div className="flex-1 min-w-[200px] border-r border-orange-200">
        <input
          type="text"
          value={participant.name}
          onChange={(e) => onUpdate(participant.id, 'name', e.target.value)}
          placeholder="Nome do Participante"
          className="w-full px-4 py-3 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-inset text-sm text-slate-700 font-medium placeholder-indigo-200 transition-all"
        />
      </div>

      {/* WhatsApp Input */}
      <div className="w-40 md:w-48 flex-shrink-0 border-r border-orange-200 relative group/input">
        <input
          type="tel"
          value={participant.whatsapp}
          onChange={(e) => onUpdate(participant.id, 'whatsapp', e.target.value)}
          placeholder="(00) 00000-0000"
          className="w-full px-4 py-3 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-inset text-sm text-slate-600 placeholder-indigo-200 transition-all"
        />
        {!isEmpty && (
           <button 
             onClick={() => onGenerateMessage(participant)}
             title="Gerar mensagem com IA"
             className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600 bg-white/80 hover:bg-white rounded-full p-1 shadow-sm opacity-0 group-hover/input:opacity-100 transition-all transform hover:scale-110"
           >
             <MessageCircle size={16} />
           </button>
        )}
      </div>

      {/* Weeks Checks */}
      <div className="flex w-56 md:w-80 flex-shrink-0">
        {participant.weeks.map((paid, weekIndex) => (
          <div key={weekIndex} className="flex-1 border-r border-orange-200 flex justify-center items-center py-1">
            <button
              onClick={() => onUpdate(participant.id, 'week', !paid, weekIndex)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ease-out ${
                paid 
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-200 scale-100' 
                  : 'bg-indigo-50 text-indigo-200 hover:bg-indigo-100 hover:text-indigo-300 scale-90'
              }`}
            >
              {paid ? <Check size={16} strokeWidth={3} /> : <span className="text-[10px] font-bold opacity-50">{weekIndex + 1}</span>}
            </button>
          </div>
        ))}
      </div>

      {/* Status Summary / Actions */}
      <div className="w-24 flex-shrink-0 flex items-center justify-center gap-2">
        {isComplete ? (
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-full shadow-sm">
                PAGO
            </span>
        ) : (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${participant.weeks.filter(Boolean).length > 0 ? 'bg-indigo-100 text-indigo-600' : 'text-indigo-300'}`}>
                {participant.weeks.filter(Boolean).length}/5
            </span>
        )}
        <button 
          onClick={() => onDelete(participant.id)}
          className="text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-all"
          title="Remover"
        >
            <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default memo(SpreadsheetRow);