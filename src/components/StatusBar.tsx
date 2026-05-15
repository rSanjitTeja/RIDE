import { GitBranch, ShieldAlert, ShieldCheck, Terminal as TerminalIcon, Database } from 'lucide-react';
import type { AppSettings, WorkspaceIndex } from '../types';

interface StatusBarProps {
  language: string;
  settings: AppSettings;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  workspaceIndex: WorkspaceIndex | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ language, settings, onToggleTerminal, isTerminalOpen, workspaceIndex }) => {
  return (
    <div className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] select-none font-sans">
      <div className="flex items-center space-x-4">
        <div className="flex items-center cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          <GitBranch size={12} className="mr-1" />
          <span>main</span>
        </div>
        <div className="flex items-center cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors" onClick={onToggleTerminal}>
          <TerminalIcon size={12} className={`mr-1 ${isTerminalOpen ? 'text-green-300' : 'text-white'}`} />
          <span>Terminal</span>
        </div>
        {workspaceIndex && (
          <div className="flex items-center px-1 py-0.5 rounded">
            <Database size={12} className="mr-1 text-cyan-300" />
            <span className="text-cyan-300">{workspaceIndex.totalFiles} files indexed</span>
          </div>
        )}
        <div className="flex items-center cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          {settings.firewall.enabled ? (
            <ShieldCheck size={12} className="mr-1 text-green-300" />
          ) : (
            <ShieldAlert size={12} className="mr-1 text-red-300" />
          )}
          <span>Firewall {settings.firewall.enabled ? 'Active' : 'Disabled'}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors truncate max-w-[150px]">
          {settings.model}
        </div>
        <div className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          UTF-8
        </div>
        <div className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors uppercase">
          {language || 'Plain Text'}
        </div>
      </div>
    </div>
  );
};
