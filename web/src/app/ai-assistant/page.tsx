'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  Dna,
  Bot,
  User,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  fetchSamplesApi,
  sendAssistantChatApi,
  Sample
} from '@/lib/api-client';

const SUGGESTED_PROMPTS = [
  'Explain the difference between transition and transversion mutations.',
  'Summarize the mutations identified across my analyzed samples.',
  'How does high GC content affect DNA thermal stability and melting temperature?',
  'Explain how the Needleman-Wunsch dynamic programming algorithm aligns sequences.',
  'What is the pharmacogenomic clinical significance of CYP2C19 for clopidogrel?'
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AiAssistantPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        '### 🧬 Welcome to the GenomicsAI Research Assistant\n\n' +
        'I am your scientific bioinformatics assistant, grounded directly in your stored sequence repository, alignment algorithms, and clinical variant annotations.\n\n' +
        '**I can assist you with:**\n' +
        '- **Sequence Biochemistry:** Analyzing nucleotide frequencies, GC content, and replication skews.\n' +
        '- **Variant Interpretation:** Explaining transitions vs transversions, frameshifts, and HGVS nomenclature.\n' +
        '- **Algorithmic Theory:** Clarifying Needleman-Wunsch global alignment and KMP motif detection.\n' +
        '- **Clinical Genetics:** Explaining curated ClinVar disease associations (e.g. *HBB*, *BRCA1*, *TP53*) and CPIC pharmacogenomic guidelines.\n\n' +
        '*Select any suggested question below or type your research query to begin.*',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSamplesApi()
      .then((data) => setSamples(data))
      .catch((err) => console.warn('Samples fetch error:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await sendAssistantChatApi({
        message: text.trim(),
        sample_id: selectedSampleId || undefined
      });

      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          '**System Notice:** Could not reach the backend AI assistant server. ' +
          'Running in local mode: Transition mutations represent purine↔purine ($A \\longleftrightarrow G$) or pyrimidine↔pyrimidine ($C \\longleftrightarrow T$) substitutions, while transversions interchange a purine and a pyrimidine ring.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <GenomicsHeader
        title="Genomics AI Assistant"
        subtitle="Interactive bioinformatics research assistant grounded in your sequence and variant repository."
      />

      {/* Main Chat Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden min-h-0">
        {/* Context Selector Bar */}
        <div className="px-5 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase">Context Sample:</span>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">-- General Repository Knowledge --</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.length} bp)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Educational & Research Use Only</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-teal-600 text-white font-medium'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 font-normal prose prose-sm max-w-none'
                  }`}
                >
                  {/* Clean Markdown parsing / formatted text */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {m.content.split('\n\n').map((para, i) => {
                      if (para.startsWith('### ')) {
                        return (
                          <h4 key={i} className="font-bold text-base text-slate-900 border-b border-slate-200 pb-1 mt-2 first:mt-0">
                            {para.replace('### ', '')}
                          </h4>
                        );
                      }
                      return (
                        <p key={i} className="leading-relaxed">
                          {para}
                        </p>
                      );
                    })}
                  </div>
                  <span
                    className={`block text-[10px] mt-2 font-mono ${
                      isUser ? 'text-teal-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 items-center text-xs text-slate-400 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <span className="font-medium">Analyzing genomic repository and generating scientific response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Bar */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Suggested:
          </span>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p)}
              className="px-3 py-1 rounded-full bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-600 text-xs font-medium flex-shrink-0 transition-colors"
            >
              {p.slice(0, 48)}...
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about mutations, alignments, GC content, ClinVar genes, or drug interactions..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

