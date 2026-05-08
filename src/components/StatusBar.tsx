import { GitBranch, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { AppSettings } from '../types';

interface StatusBarProps {
  language: string;
  settings: AppSettings;
}

export const StatusBar: React.FC<StatusBarProps> = ({ language, settings }) => {
  return (
    <div className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] select-none font-sans">
      <div className="flex items-center space-x-4">
        <div className="flex items-center cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          <GitBranch size={12} className="mr-1" />
          <span>main</span>
        </div>
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
