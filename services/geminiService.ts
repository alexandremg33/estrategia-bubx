import { GoogleGenAI } from "@google/genai";
import { Participant } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment variables");
  return new GoogleGenAI({ apiKey });
};

export const analyzeParticipants = async (participants: Participant[]) => {
  try {
    const ai = getClient();
    
    // Filter to only active participants to save tokens and context window
    const activeParticipants = participants.filter(p => p.name.trim() !== '' || p.whatsapp.trim() !== '');
    
    if (activeParticipants.length === 0) {
      return "Não há dados suficientes para analisar. Preencha a planilha com alguns nomes.";
    }

    const summary = activeParticipants.map(p => ({
      name: p.name,
      paidWeeks: p.weeks.filter(w => w).length,
      missedWeeks: 5 - p.weeks.filter(w => w).length
    }));

    const prompt = `
      Analise os seguintes dados de participantes da 'Estratégia HUBX'.
      O objetivo é identificar padrões de inadimplência e sugerir ações.
      
      Dados (Resumo):
      ${JSON.stringify(summary.slice(0, 50))} ${summary.length > 50 ? `... e mais ${summary.length - 50} outros.` : ''}

      Forneça um relatório curto e estratégico em Markdown abordando:
      1. Taxa geral de adimplência (visual).
      2. Sugestão de mensagem de cobrança amigável para quem deve 2 ou mais semanas.
      3. Ações motivacionais para quem pagou tudo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for this
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing data:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API ou tente novamente mais tarde.";
  }
};

export const generateMessageForParticipant = async (participant: Participant) => {
  try {
    const ai = getClient();
    const missedWeeks = participant.weeks.map((paid, index) => paid ? null : index + 1).filter(w => w !== null);
    
    const prompt = `
      Escreva uma mensagem curta e profissional de WhatsApp para ${participant.name || 'o participante'}.
      Contexto: Estratégia HUBX.
      Situação: ${missedWeeks.length === 0 ? 'Pagamento completo! Agradecer.' : `Pagamento pendente das semanas: ${missedWeeks.join(', ')}.`}
      Tom: Amigável, motivador, mas direto. Use emojis.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return "Erro ao gerar mensagem.";
  }
};