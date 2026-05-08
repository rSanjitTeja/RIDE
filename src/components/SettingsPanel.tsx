import { useState } from 'react';
import { X, ShieldAlert, Key, Zap, Palette, Plus, Trash2 } from 'lucide-react';
import type { AppSettings, FirewallSettings } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'firewall' | 'workspace' | 'appearance'>('ai');
  const [newRule, setNewRule] = useState('');

  if (!isOpen) return null;

  const updateSettings = (partial: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const updateFirewall = (partial: Partial<FirewallSettings>) => {
    updateSettings({ firewall: { ...settings.firewall, ...partial } });
  };

  const handleAddCustomRule = () => {
    if (newRule.trim() && !settings.firewall.customRules.includes(newRule.trim())) {
      updateFirewall({ customRules: [...settings.firewall.customRules, newRule.trim()] });
      setNewRule('');
    }
  };

  const handleRemoveCustomRule = (rule: string) => {
    updateFirewall({ customRules: settings.firewall.customRules.filter(r => r !== rule) });
  };

  return (
    <div className="absolute inset-y-0 right-0 w-[400px] bg-[#1A1D27] shadow-2xl border-l border-border flex flex-col z-50 transform transition-transform duration-300">
      <div className="p-4 border-b border-border flex justify-between items-center bg-[#0F111A]">
        <h2 className="text-lg font-semibold text-text-main">Settings</h2>
        <button onClick={onClose} className="p-1 hover:bg-surface rounded text-text-muted hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tabs sidebar */}
        <div className="w-1/3 bg-[#0F111A] border-r border-border p-2 space-y-1">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'ai' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <Zap size={14} className="mr-2" /> AI Model
          </button>
          <button 
            onClick={() => setActiveTab('firewall')}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'firewall' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <ShieldAlert size={14} className="mr-2" /> Firewall
          </button>
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'workspace' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <Key size={14} className="mr-2" /> Workspace
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'appearance' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <Palette size={14} className="mr-2" /> Appearance
          </button>
        </div>

        {/* Tab content */}
        <div className="w-2/3 p-4 overflow-y-auto">
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">API Key</label>
                <input 
                  type="password" 
                  value={settings.apiKey}
                  onChange={e => updateSettings({ apiKey: e.target.value })}
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="AIza..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Model</label>
                <select 
                  value={settings.model}
                  onChange={e => updateSettings({ model: e.target.value })}
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
                  <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'firewall' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Master Toggle</span>
                <input 
                  type="checkbox" 
                  checked={settings.firewall.enabled}
                  onChange={e => updateFirewall({ enabled: e.target.checked })}
                  className="toggle-checkbox"
                />
              </div>

              {settings.firewall.enabled && (
                <>
                  <div className="pt-2 border-t border-border">
                    <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">Mode</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateFirewall({ mode: 'block' })}
                        className={`flex-1 py-1 px-2 rounded text-xs border ${settings.firewall.mode === 'block' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-border text-text-muted hover:border-textMuted'}`}
                      >
                        Block
                      </button>
                      <button 
                        onClick={() => updateFirewall({ mode: 'warn' })}
                        className={`flex-1 py-1 px-2 rounded text-xs border ${settings.firewall.mode === 'warn' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-border text-text-muted hover:border-textMuted'}`}
                      >
                        Redact/Warn
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Built-in Rules</label>
                    {Object.entries(settings.firewall.rules).map(([rule, isEnabled]) => (
                      <div key={rule} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{rule.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <input 
                          type="checkbox" 
                          checked={isEnabled}
                          onChange={e => updateFirewall({ rules: { ...settings.firewall.rules, [rule]: e.target.checked } })}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Custom RegEx</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={newRule}
                        onChange={e => setNewRule(e.target.value)}
                        placeholder="e.g. \bSecret\b"
                        className="flex-1 bg-surface border border-border rounded px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                      <button onClick={handleAddCustomRule} className="p-1.5 bg-surface border border-border rounded hover:bg-primary hover:text-white transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {settings.firewall.customRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-surface border border-border rounded px-2 py-1 text-xs font-mono">
                          <span className="truncate">{rule}</span>
                          <button onClick={() => handleRemoveCustomRule(rule)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Auto-attach open files</span>
                <input 
                  type="checkbox" 
                  checked={settings.workspace.autoAttachOpenFiles}
                  onChange={e => updateSettings({ workspace: { ...settings.workspace, autoAttachOpenFiles: e.target.checked } })}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Send file tree context</span>
                <input 
                  type="checkbox" 
                  checked={settings.workspace.sendFileTree}
                  onChange={e => updateSettings({ workspace: { ...settings.workspace, sendFileTree: e.target.checked } })}
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Font Size</label>
                <input 
                  type="range" 
                  min="10" max="24" 
                  value={settings.appearance.fontSize}
                  onChange={e => updateSettings({ appearance: { ...settings.appearance, fontSize: parseInt(e.target.value) } })}
                  className="w-full accent-primary"
                />
                <div className="text-right text-xs text-text-muted">{settings.appearance.fontSize}px</div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Font Family</label>
                <select 
                  value={settings.appearance.fontFamily}
                  onChange={e => updateSettings({ appearance: { ...settings.appearance, fontFamily: e.target.value } })}
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="Consolas, 'Courier New', monospace">Consolas</option>
                  <option value="'Fira Code', monospace">Fira Code</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
