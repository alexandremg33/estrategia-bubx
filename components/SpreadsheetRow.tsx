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
    <div className={`flex items-center border-b border-gray-200 hover:bg-blue-50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Index */}
      <div className="w-12 flex-shrink-0 text-center text-xs text-gray-400 py-3 select-none">
        {index + 1}
      </div>

      {/* Name Input */}
      <div className="flex-1 min-w-[200px] border-r border-gray-200">
        <input
          type="text"
          value={participant.name}
          onChange={(e) => onUpdate(participant.id, 'name', e.target.value)}
          placeholder="Nome do Participante"
          className="w-full px-3 py-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800 placeholder-gray-300"
        />
      </div>

      {/* WhatsApp Input */}
      <div className="w-40 md:w-48 flex-shrink-0 border-r border-gray-200 relative">
        <input
          type="tel"
          value={participant.whatsapp}
          onChange={(e) => onUpdate(participant.id, 'whatsapp', e.target.value)}
          placeholder="(00) 00000-0000"
          className="w-full px-3 py-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800 placeholder-gray-300"
        />
        {!isEmpty && (
           <button 
             onClick={() => onGenerateMessage(participant)}
             title="Gerar mensagem com IA"
             className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
           >
             <MessageCircle size={16} />
           </button>
        )}
      </div>

      {/* Weeks Checks */}
      <div className="flex w-56 md:w-80 flex-shrink-0">
        {participant.weeks.map((paid, weekIndex) => (
          <div key={weekIndex} className="flex-1 border-r border-gray-200 flex justify-center items-center py-1">
            <button
              onClick={() => onUpdate(participant.id, 'week', !paid, weekIndex)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all duration-200 ${
                paid 
                  ? 'bg-green-500 text-white shadow-sm scale-100' 
                  : 'bg-gray-100 text-gray-300 hover:bg-gray-200 scale-90'
              }`}
            >
              {paid ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{weekIndex + 1}</span>}
            </button>
          </div>
        ))}
      </div>

      {/* Status Summary / Actions */}
      <div className="w-24 flex-shrink-0 flex items-center justify-center gap-2">
        {isComplete ? (
            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                PAGO
            </span>
        ) : (
            <span className="text-xs font-medium text-gray-400">
                {participant.weeks.filter(Boolean).length}/5
            </span>
        )}
        <button 
          onClick={() => onDelete(participant.id)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
            <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default memo(SpreadsheetRow);