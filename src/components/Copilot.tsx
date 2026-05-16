import { useState, useRef, useEffect } from 'react';
import {
  Settings as SettingsIcon, Send, AlertTriangle, ShieldAlert,
  Database, RefreshCw, Trash2, ChevronDown, Bot, User, Copy, Check
} from 'lucide-react';
import type { Message, OpenFile, AppSettings, WorkspaceIndex } from '../types';

interface CopilotProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  openFiles: OpenFile[];
  onOpenSettings: () => void;
  settings: AppSettings;
  isLoading: boolean;
  workspaceIndex: WorkspaceIndex | null;
  isIndexing: boolean;
  indexingProgress: number;
  onIndexWorkspace: () => void;
  onToggleSlm: (enabled: boolean) => void;
  loadingText?: string;
}

// Simple inline code and bold renderer — avoids a full markdown dependency
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf('\n');
      const lang = newlineIdx > 0 ? inner.slice(0, newlineIdx).trim() : '';
      const code = newlineIdx > 0 ? inner.slice(newlineIdx + 1) : inner;
      return (
        <CodeBlock key={i} code={code} lang={lang} />
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[#1a1d2e] text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Handle newlines as <br>
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 ? <br /> : null}</span>
    ));
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-2 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-[#0F111A] px-3 py-1.5">
        <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{lang || 'code'}</span>
        <button onClick={copy} className="text-text-muted hover:text-white transition-colors">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="bg-[#0a0c14] p-3 overflow-x-auto text-[12px] font-mono text-text-main leading-relaxed custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export const Copilot: React.FC<CopilotProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  openFiles,
  onOpenSettings,
  settings,
  isLoading,
  workspaceIndex,
  isIndexing,
  indexingProgress,
  onIndexWorkspace,
  onToggleSlm,
  loadingText = 'Thinking...',
}) => {
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 100);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  // Visible conversation messages (filter out internal system tags)
  const visibleMessages = messages.filter(
    m => m.role !== 'system' || !m.content.startsWith('__INDEXED__')
  );

  // Extract indexing confirmation message
  const indexedMsg = messages.find(m => m.content.startsWith('__INDEXED__'));
  const [, indexedFiles, indexedLines] = indexedMsg?.content.split(':') ?? [];

  return (
    <div className="w-[300px] h-full flex flex-col bg-[#1A1D27] shadow-xl relative z-10 border-l border-border">

      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b border-border bg-[#0F111A] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,209,255,0.6)]"></div>
            <span className="font-bold text-xs tracking-widest text-cyan-400 uppercase">Copilot Agent</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onClearChat}
              className="p-1.5 hover:bg-white/5 rounded text-text-muted hover:text-white transition-colors"
              title="Clear chat"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 hover:bg-white/5 rounded text-text-muted hover:text-white transition-colors"
              title="Settings"
            >
              <SettingsIcon size={13} />
            </button>
          </div>
        </div>

        {/* Model pill */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-text-muted font-mono truncate max-w-[160px]">{settings.model}</span>
          <div className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${settings.firewall.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {settings.firewall.enabled ? 'FIREWALL ON' : 'FIREWALL OFF'}
          </div>
        </div>

        {/* SLM Toggle */}
        <div className="flex items-center justify-between bg-surface border border-border rounded px-2 py-1.5 mt-1">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert size={11} className="text-purple-400" />
            <span className="text-[10px] font-medium text-text-main">Local SLM Guard</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.firewall.slm?.enabled ?? false}
              onChange={(e) => onToggleSlm(e.target.checked)}
            />
            <div className="w-6 h-3.5 bg-[#0F111A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500/50 border border-border"></div>
          </label>
        </div>
      </div>

      {/* ── Workspace Index Banner ── */}
      <div className="px-3 py-2 border-b border-border bg-[#12141F] flex-shrink-0">
        {!workspaceIndex && !isIndexing && (
          <button
            onClick={onIndexWorkspace}
            disabled={!settings.apiKey}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Database size={13} />
            <span>Index Workspace (One-time)</span>
          </button>
        )}
        {isIndexing && (
          <div className="flex items-center space-x-2 text-xs text-yellow-400">
            <RefreshCw size={12} className="animate-spin" />
            <span>Indexing... {indexingProgress} files read</span>
          </div>
        )}
        {workspaceIndex && !isIndexing && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[10px] text-green-400">
              <Database size={11} />
              <span className="font-semibold">
                {workspaceIndex.totalFiles} files · {workspaceIndex.totalLines.toLocaleString()} lines indexed
              </span>
            </div>
            <button
              onClick={onIndexWorkspace}
              className="text-[9px] text-text-muted hover:text-white transition-colors flex items-center gap-1"
              title="Re-index workspace"
            >
              <RefreshCw size={10} /> Re-index
            </button>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
      >
        {visibleMessages.filter(m => m.role !== 'system').length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted text-center px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
              <Bot size={24} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-main">Copilot Agent</p>
              <p className="text-xs mt-1 opacity-60 leading-relaxed">
                {workspaceIndex
                  ? `I've analyzed ${workspaceIndex.totalFiles} files in your workspace. Ask me anything about your code.`
                  : 'Index your workspace first so I can understand your entire codebase. Then ask me anything.'}
              </p>
            </div>
            {workspaceIndex && (
              <div className="text-[10px] text-text-muted space-y-1 w-full">
                <p className="font-semibold text-text-main mb-1">Try asking:</p>
                {[
                  'Explain the architecture of this project',
                  'What does the compiler.ts file do?',
                  'Find potential bugs in my code',
                  'How do I add a new feature to...',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => onSendMessage(q)}
                    className="w-full text-left px-2 py-1.5 rounded bg-surface/50 border border-border hover:border-cyan-500/40 hover:text-cyan-400 transition-all text-[10px]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Indexed confirmation chip */}
            {indexedFiles && (
              <div className="flex justify-center">
                <div className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Database size={10} /> {indexedFiles} files indexed · {parseInt(indexedLines || '0').toLocaleString()} lines
                </div>
              </div>
            )}

            {visibleMessages.map((msg, i) => {
              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex items-start my-2">
                    <div className="max-w-[95%] p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-tl-none shadow-md">
                      <div className="flex items-center gap-1 mb-1 font-semibold">
                        <AlertTriangle size={11} /> {msg.content.includes('Error') || msg.content.includes('Blocked') ? 'Error' : 'System'}
                      </div>
                      <div className="space-y-1">{renderContent(msg.content.replace('Error: ', ''))}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex flex-col mb-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Role indicator */}
                  <div className={`flex items-center gap-1.5 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary' : 'bg-cyan-500/20 border border-cyan-500/30'}`}>
                      {msg.role === 'user' ? <User size={10} className="text-white" /> : <Bot size={10} className="text-cyan-400" />}
                    </div>
                    <span className="text-[9px] text-text-muted">{msg.role === 'user' ? 'You' : 'Copilot'}</span>
                  </div>

                  <div className={`max-w-[95%] p-3 rounded-xl text-[12.5px] leading-relaxed shadow-md ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-[#0F111A] border border-border text-text-main rounded-tl-none'
                  }`}>
                    {msg.content.includes('[REDACTED]') ? (
                      <div className="flex flex-col">
                        <span>{msg.content}</span>
                        <span className="text-[10px] text-yellow-400 mt-1 flex items-center">
                          <AlertTriangle size={10} className="mr-1" /> Sanitized by Firewall
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">{renderContent(msg.content)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start">
            <div className="p-3 rounded-xl bg-[#0F111A] border border-border rounded-tl-none shadow-md flex items-center space-x-2">
              <div className="flex space-x-1">
                {[0, 150, 300].map(delay => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-text-muted">{loadingText}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-[76px] right-4 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-opacity-80 transition-all z-20"
        >
          <ChevronDown size={14} className="text-white" />
        </button>
      )}

      {/* ── Open file context pills ── */}
      {settings.workspace.autoAttachOpenFiles && openFiles.length > 0 && (
        <div className="px-2 py-1.5 bg-[#0F111A] border-t border-border flex gap-1.5 overflow-x-auto hide-scrollbar flex-shrink-0">
          <span className="text-[9px] text-text-muted self-center flex-shrink-0">Context:</span>
          {openFiles.map((file, i) => (
            <div key={i} className="flex-shrink-0 bg-surface px-2 py-0.5 rounded text-[9px] text-cyan-400 border border-cyan-500/20 flex items-center">
              {file.name}
            </div>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="p-3 bg-[#0F111A] border-t border-border flex-shrink-0">
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={workspaceIndex ? 'Ask about your codebase...' : 'Ask Copilot anything...'}
            className="flex-1 bg-surface text-[12.5px] text-text-main border border-border rounded-xl p-3 pr-10 resize-none focus:outline-none focus:border-cyan-500/50 transition-colors min-h-[52px] max-h-[120px] custom-scrollbar placeholder-text-muted/50"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[9px] text-text-muted mt-1.5 text-center opacity-50">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
};
