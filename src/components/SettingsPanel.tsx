import { useState } from 'react';
import { X, ShieldAlert, Key, Zap, Palette, Plus, Trash2, CheckCircle, XCircle, Lock, Shield } from 'lucide-react';
import type { AppSettings, FirewallSettings } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  isAdminAuthenticated: boolean;
  onRequestAdminAccess: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  isAdminAuthenticated,
  onRequestAdminAccess,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'firewall' | 'workspace' | 'appearance'>('ai');
  const [newRule, setNewRule] = useState('');
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [apiTestMessage, setApiTestMessage] = useState('');

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

  const testApiKey = async () => {
    if (!settings.apiKey.trim()) {
      setApiTestStatus('fail');
      setApiTestMessage('No API key entered.');
      return;
    }
    setApiTestStatus('testing');
    setApiTestMessage('');
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }),
      });
      const data = await res.json();
      if (data.error) {
        setApiTestStatus('fail');
        setApiTestMessage(data.error.message || 'Invalid API key.');
      } else {
        setApiTestStatus('ok');
        setApiTestMessage('API key is valid and working!');
      }
    } catch (e: any) {
      setApiTestStatus('fail');
      setApiTestMessage('Network error: ' + e.message);
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-[400px] bg-[#1A1D27] shadow-2xl border-l border-border flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-[#0F111A]">
        <h2 className="text-lg font-semibold text-text-main">Settings</h2>
        <button onClick={onClose} className="p-1 hover:bg-surface rounded text-text-muted hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar tabs */}
        <div className="w-1/3 bg-[#0F111A] border-r border-border p-2 space-y-1">
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'ai' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <Zap size={14} className="mr-2" /> AI Model
          </button>

          <button
            onClick={() => { setActiveTab('firewall'); if (!isAdminAuthenticated) onRequestAdminAccess(); }}
            className={`w-full flex items-center p-2 rounded text-sm text-left transition-colors ${activeTab === 'firewall' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-text-muted hover:bg-surface hover:text-white'}`}
          >
            <ShieldAlert size={14} className="mr-2" />
            Firewall
            {!isAdminAuthenticated && <Lock size={11} className="ml-auto opacity-60" />}
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
        <div className="w-2/3 p-4 overflow-y-auto custom-scrollbar">

          {/* ── AI Model Tab ── */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Gemini API Key</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={e => { updateSettings({ apiKey: e.target.value }); setApiTestStatus('idle'); }}
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none text-text-main"
                  placeholder="AIza..."
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Get a free key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent underline">
                    aistudio.google.com
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Model</label>
                <select
                  value={settings.model}
                  onChange={e => updateSettings({ model: e.target.value })}
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none text-text-main"
                >
                  <optgroup label="── Gemini 2.5 ──">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </optgroup>
                  <optgroup label="── Gemini 2.0 ──">
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-2.0-flash-001">Gemini 2.0 Flash-001</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                  </optgroup>
                  <optgroup label="── Gemini 1.5 ──">
                    <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
                  </optgroup>
                </select>
              </div>

              <button
                onClick={testApiKey}
                disabled={apiTestStatus === 'testing'}
                className="w-full py-2 rounded text-sm font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {apiTestStatus === 'testing' ? '⏳ Testing...' : '⚡ Test Connection'}
              </button>

              {apiTestStatus === 'ok' && (
                <div className="flex items-center gap-2 text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded p-2">
                  <CheckCircle size={13} /> {apiTestMessage}
                </div>
              )}
              {apiTestStatus === 'fail' && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded p-2">
                  <XCircle size={13} className="flex-shrink-0 mt-0.5" /> {apiTestMessage}
                </div>
              )}
            </div>
          )}

          {/* ── Firewall Tab ── */}
          {activeTab === 'firewall' && (
            isAdminAuthenticated ? (
              <div className="space-y-4">
                {/* Admin badge */}
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  <Shield size={12} className="text-red-400" />
                  <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Admin Mode Active</span>
                </div>

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
                  <div className="space-y-4">
                    <div className="pt-2 border-t border-border">
                      <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">Mode</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateFirewall({ mode: 'block' })}
                          className={`flex-1 py-1 px-2 rounded text-xs border ${settings.firewall.mode === 'block' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-border text-text-muted'}`}
                        >
                          Block
                        </button>
                        <button
                          onClick={() => updateFirewall({ mode: 'warn' })}
                          className={`flex-1 py-1 px-2 rounded text-xs border ${settings.firewall.mode === 'warn' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-border text-text-muted'}`}
                        >
                          Redact / Warn
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
                      <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Custom RegEx Rules</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newRule}
                          onChange={e => setNewRule(e.target.value)}
                          placeholder="e.g. \bSecret\b"
                          className="flex-1 bg-surface border border-border rounded px-2 py-1 text-sm focus:border-primary focus:outline-none text-text-main"
                        />
                        <button
                          onClick={handleAddCustomRule}
                          className="p-1.5 bg-surface border border-border rounded hover:bg-primary hover:text-white transition-colors"
                        >
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
                  </div>
                )}
              </div>
            ) : (
              /* Lock screen */
              <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Shield size={28} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Admin Access Required</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Guard Rails configuration requires admin authentication.
                  </p>
                </div>
                <button
                  onClick={onRequestAdminAccess}
                  className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all flex items-center gap-2"
                >
                  <Lock size={13} /> Authenticate as Admin
                </button>
              </div>
            )
          )}

          {/* ── Workspace Tab ── */}
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

          {/* ── Appearance Tab ── */}
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
                  className="w-full bg-surface border border-border rounded p-2 text-sm focus:border-primary focus:outline-none text-text-main"
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
