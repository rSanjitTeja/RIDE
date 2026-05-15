
import React, { useEffect, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  output: string;
  onClear: () => void;
  isLoading: boolean;
}

// Colorize the raw output text into styled spans
function colorize(line: string): React.ReactNode {
  if (/^\[Error\]|^Traceback|^SyntaxError|^NameError|^TypeError|^ValueError|^RuntimeError|^AttributeError/i.test(line)) {
    return <span className="text-red-400">{line}</span>;
  }
  if (/^\[warn\]/i.test(line)) {
    return <span className="text-yellow-400">{line}</span>;
  }
  if (/^\[info\]/i.test(line)) {
    return <span className="text-blue-300">{line}</span>;
  }
  if (/^> Running/.test(line)) {
    return <span className="text-cyan-400 font-semibold">{line}</span>;
  }
  if (/^\[Process exited with code 0\]/.test(line)) {
    return <span className="text-green-400">{line}</span>;
  }
  if (/^\[Process exited with code [^0]/.test(line)) {
    return <span className="text-red-400">{line}</span>;
  }
  if (/^\s+\(First run/.test(line)) {
    return <span className="text-yellow-300 italic">{line}</span>;
  }
  return <span className="text-text-main">{line}</span>;
}

export const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, output, onClear, isLoading }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  if (!isOpen) return null;

  const lines = output.split('\n');

  return (
    <div className="absolute bottom-0 left-0 right-0 h-64 bg-[#0A0C14] border-t border-border flex flex-col z-30 shadow-2xl">
      {/* Header */}
      <div className="h-9 bg-[#12141F] border-b border-border flex items-center justify-between px-4 select-none flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">⬡ Terminal</span>
          <div className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-medium border border-cyan-500/20">
            OUTPUT
          </div>
          {isLoading && (
            <div className="flex items-center space-x-1.5">
              <div className="flex space-x-0.5">
                <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-[10px] text-cyan-400 font-medium">RUNNING</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={onClear}
            className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-text-muted hover:text-text-main"
            title="Clear Output"
          >
            <Trash2 size={13} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-text-muted hover:text-red-400"
            title="Close Terminal"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed custom-scrollbar"
      >
        {output.trim() ? (
          <div className="space-y-0.5">
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {colorize(line)}
              </div>
            ))}
            {isLoading && (
              <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle opacity-80"></span>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-xs italic opacity-40">
            Run code to see output here · <span className="ml-1 text-cyan-400 not-italic">Ctrl+Enter</span>
          </div>
        )}
      </div>
    </div>
  );
};
