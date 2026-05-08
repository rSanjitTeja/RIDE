import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Send, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Message, OpenFile, AppSettings } from '../types';

interface CopilotProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  openFiles: OpenFile[];
  onOpenSettings: () => void;
  settings: AppSettings;
  isLoading: boolean;
}

export const Copilot: React.FC<CopilotProps> = ({
  messages,
  onSendMessage,
  openFiles,
  onOpenSettings,
  settings,
  isLoading
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="w-[280px] h-full flex flex-col bg-[#1A1D27] shadow-xl relative z-10">
      {/* Header */}
      <div className="p-3 border-b border-border flex justify-between items-center bg-[#0F111A]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="font-semibold text-sm tracking-wide text-text-main">{settings.model}</span>
        </div>
        <button onClick={onOpenSettings} className="text-text-muted hover:text-white transition-colors">
          <SettingsIcon size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(m => m.role !== 'system').length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3 border border-border">
              <ShieldAlert size={20} className={settings.firewall.enabled ? "text-green-400" : "text-red-400"} />
            </div>
            <p className="text-sm">I'm NeuralIDE Copilot.</p>
            <p className="text-xs mt-1 opacity-70">Ask me anything about your code.</p>
          </div>
        ) : (
          messages.filter(m => m.role !== 'system').map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] p-3 rounded-lg text-sm shadow-md ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-surface border border-border text-text-main rounded-bl-none'
              }`}>
                {msg.content.includes('[REDACTED]') ? (
                  <div className="flex flex-col">
                    <span>{msg.content}</span>
                    <span className="text-[10px] text-yellow-400 mt-1 flex items-center">
                      <AlertTriangle size={10} className="mr-1" /> Sanitized by Firewall
                    </span>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start">
            <div className="max-w-[90%] p-3 rounded-lg bg-surface border border-border rounded-bl-none flex items-center space-x-1 shadow-md">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Pills */}
      {settings.workspace.autoAttachOpenFiles && openFiles.length > 0 && (
        <div className="px-3 py-2 bg-[#0F111A] border-t border-border flex gap-2 overflow-x-auto hide-scrollbar">
          {openFiles.map((file, i) => (
            <div key={i} className="flex-shrink-0 bg-surface px-2 py-1 rounded text-[10px] text-text-muted border border-border flex items-center">
              <span className="truncate max-w-[100px]">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-[#0F111A] border-t border-border">
        <div className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Copilot..."
            className="w-full bg-surface text-sm text-text-main border border-border rounded-lg p-3 pr-10 resize-none focus:outline-none focus:border-primary transition-colors min-h-[60px] max-h-[150px] custom-scrollbar"
            rows={2}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
