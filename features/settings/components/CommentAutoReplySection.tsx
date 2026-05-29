'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, MessageSquare, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useUpdateChannelMutation } from '@/lib/query/hooks/useChannelsQuery';
import { cn } from '@/lib/utils/cn';
import type { MessagingChannel } from '@/lib/messaging/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutoReplyRule {
  keywords: string[];
  dmMessage: string;
  publicReply: string;
  mediaId: string;
}

const emptyRule = (): AutoReplyRule => ({
  keywords: [],
  dmMessage: '',
  publicReply: '',
  mediaId: '',
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KeywordInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (kws: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const kw = input.trim();
    if (!kw || keywords.includes(kw)) return;
    onChange([...keywords, kw]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ex: LINK, quero, informações..."
          className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          Adicionar
        </button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300"
            >
              {kw}
              <button
                type="button"
                onClick={() => onChange(keywords.filter((k) => k !== kw))}
                className="ml-0.5 hover:text-red-500 transition-colors"
                aria-label={`Remover palavra-chave ${kw}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleEditor({
  rule,
  index,
  onChange,
  onRemove,
}: {
  rule: AutoReplyRule;
  index: number;
  onChange: (r: AutoReplyRule) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-black/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Regra {index + 1}
          {rule.keywords.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              — {rule.keywords.slice(0, 3).join(', ')}{rule.keywords.length > 3 ? '…' : ''}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Remover regra"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-dark-card">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Palavras-chave <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400">
              Quando o comentário contiver qualquer uma dessas palavras, a regra dispara.
            </p>
            <KeywordInput
              keywords={rule.keywords}
              onChange={(kws) => onChange({ ...rule, keywords: kws })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mensagem de DM privada <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400">
              Enviada no direct para quem comentou. Use para mandar o link, o material ou iniciar a conversa.
            </p>
            <textarea
              rows={3}
              value={rule.dmMessage}
              onChange={(e) => onChange({ ...rule, dmMessage: e.target.value })}
              placeholder="Oi! Vi que você quer saber mais sobre automação 😊 Aqui está o link: ..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Resposta pública ao comentário (opcional)
            </label>
            <p className="text-xs text-slate-400">
              Aparece publicamente sob o comentário. Ex: "Te mandei no direct!" — gera prova social.
            </p>
            <input
              type="text"
              value={rule.publicReply}
              onChange={(e) => onChange({ ...rule, publicReply: e.target.value })}
              placeholder="Te mandei no direct! 📩"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Restringir a um post específico (opcional)
            </label>
            <p className="text-xs text-slate-400">
              Cole o Media ID do post. Deixe em branco para valer em todos os posts.
            </p>
            <input
              type="text"
              value={rule.mediaId}
              onChange={(e) => onChange({ ...rule, mediaId: e.target.value })}
              placeholder="Ex: 17854360229135492"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CommentAutoReplySectionProps {
  channel: MessagingChannel;
}

export function CommentAutoReplySection({ channel }: CommentAutoReplySectionProps) {
  const { addToast } = useToast();
  const updateMutation = useUpdateChannelMutation();

  const saved = channel.settings?.commentAutoReply;
  const [enabled, setEnabled] = useState(saved?.enabled ?? false);
  const [rules, setRules] = useState<AutoReplyRule[]>(
    (saved?.rules ?? []).map((r) => ({
      keywords: r.keywords ?? [],
      dmMessage: r.dmMessage ?? '',
      publicReply: r.publicReply ?? '',
      mediaId: r.mediaId ?? '',
    }))
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track dirty state
  useEffect(() => { setIsDirty(true); }, [enabled, rules]);
  // Reset dirty on first render
  useEffect(() => { setIsDirty(false); }, []);

  const handleSave = async () => {
    const validRules = rules.filter((r) => r.keywords.length > 0 && r.dmMessage.trim());
    if (enabled && validRules.length === 0) {
      addToast('Adicione pelo menos uma regra com palavra-chave e mensagem de DM.', 'warning');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        channelId: channel.id,
        input: {
          settings: {
            ...channel.settings,
            commentAutoReply: {
              enabled,
              rules: validRules.map((r) => ({
                keywords: r.keywords,
                dmMessage: r.dmMessage.trim(),
                ...(r.publicReply.trim() ? { publicReply: r.publicReply.trim() } : {}),
                ...(r.mediaId.trim() ? { mediaId: r.mediaId.trim() } : {}),
              })),
            },
          },
        },
      });
      addToast('Auto-resposta a comentários salva!', 'success');
      setIsDirty(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao salvar configuração.', 'error');
    }
  };

  return (
    <div className="mt-4 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 hover:from-purple-100 dark:hover:from-purple-500/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Auto-resposta a comentários
          </span>
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
              : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
          )}>
            {enabled ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-dark-card">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Quando alguém comentar em um post com uma palavra-chave configurada, o sistema envia
            automaticamente uma DM privada. Ideal para distribuir links, materiais ou iniciar
            conversas a partir de posts de conteúdo.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/10 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ativar auto-resposta</p>
              <p className="text-xs text-slate-400 mt-0.5">Processa comentários em tempo real via webhook.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => { setEnabled((v) => !v); setIsDirty(true); }}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                enabled ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                  enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={12} /> Regras ({rules.length})
              </p>
              <button
                type="button"
                onClick={() => { setRules((r) => [...r, emptyRule()]); setIsDirty(true); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus size={12} /> Nova regra
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                Nenhuma regra configurada. Clique em "Nova regra" para começar.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <RuleEditor
                    key={i}
                    rule={rule}
                    index={i}
                    onChange={(updated) => {
                      setRules((rs) => rs.map((r, idx) => (idx === i ? updated : r)));
                      setIsDirty(true);
                    }}
                    onRemove={() => {
                      setRules((rs) => rs.filter((_, idx) => idx !== i));
                      setIsDirty(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              {updateMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Salvar configuração
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
