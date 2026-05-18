import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Copilot } from './components/Copilot';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { Terminal } from './components/Terminal';
import { AuthPage } from './components/AuthPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { executeCode } from './lib/compiler';
import { indexWorkspace, buildAgentSystemPrompt } from './lib/workspaceAgent';
import type { FileNode, OpenFile, Message, AppSettings, WorkspaceIndex } from './types';
import { readDirectoryRecursive, readFileContent, saveFileContent, getLanguageFromExtension } from './lib/fileSystem';
import { runFirewall } from './lib/firewall';
import { streamGemini } from './lib/gemini';
import { onAuthChange, signOut, loadUserSettings, saveUserSettings, writeAuditLog, DEFAULT_USER_SETTINGS } from './lib/userAuth';
import { checkPromptWithSlm, DEFAULT_SLM_SYSTEM_PROMPT, type SlmCheckResult } from './lib/ollamaGuard';

const LOCAL_SETTINGS_KEY = 'relanto_ide_settings';

const INITIAL_SETTINGS: AppSettings = {
  apiKey: '',
  ...DEFAULT_USER_SETTINGS,
  firewall: {
    ...DEFAULT_USER_SETTINGS.firewall,
    slm: {
      enabled: false,
      endpoint: 'http://localhost:11434',
      model: 'phi3',
      systemPrompt: DEFAULT_SLM_SYSTEM_PROMPT,
    },
  },
};

function App() {
  // ── Auth state ──────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // ── IDE state ───────────────────────────────────────────────────────────
  const [folderName, setFolderName] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [pendingDiff, setPendingDiff] = useState<{ original: string; modified: string } | null>(null);

  // ── Agent state ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Thinking...');
  const [workspaceIndex, setWorkspaceIndex] = useState<WorkspaceIndex | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);

  // ── Settings ────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Terminal ────────────────────────────────────────────────────────────
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // ── Firebase Auth listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        // Try to load settings from Firestore
        const cloudSettings = await loadUserSettings(fbUser.uid);
        if (cloudSettings) {
          setSettings(cloudSettings);
        } else {
          // Fallback: load from localStorage (for existing users)
          const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
          if (local) {
            try { setSettings(JSON.parse(local)); } catch {}
          }
        }
        // Reset admin auth on new login
        setIsAdminAuthenticated(false);
      }
    });
    return unsub;
  }, []);

  // ── Persist settings to Firestore whenever they change ──────────────────
  useEffect(() => {
    if (user && user !== 'loading' && typeof user === 'object') {
      // Debounce: save after 1s of no changes
      const t = setTimeout(() => {
        saveUserSettings(user.uid, settings);
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [settings, user]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setFolderName(handle.name);
      const nodes = await readDirectoryRecursive(handle);
      setFiles(nodes);
      setWorkspaceIndex(null);
    } catch (e) {
      console.error('User cancelled or failed to open directory', e);
    }
  };

  const handleIndexWorkspace = async () => {
    if (files.length === 0) { alert('Please open a folder first.'); return; }
    setIsIndexing(true);
    setIndexingProgress(0);
    try {
      const index = await indexWorkspace(files, folderName || 'workspace', setIndexingProgress);
      setWorkspaceIndex(index);
      setMessages(prev => [...prev, { role: 'system', content: `__INDEXED__:${index.totalFiles}:${index.totalLines}` }]);
    } catch (e: any) {
      alert(`Indexing failed: ${e.message}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleFileSelect = async (node: FileNode) => {
    setPendingDiff(null);
    if (node.kind !== 'file') return;
    const existingIndex = openFiles.findIndex(f => f.path === node.path);
    if (existingIndex >= 0) { setActiveFileIndex(existingIndex); return; }
    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      setOpenFiles(prev => [...prev, {
        path: node.path, name: node.name, content,
        handle: node.handle as FileSystemFileHandle,
        language: getLanguageFromExtension(node.name)
      }]);
      setActiveFileIndex(openFiles.length);
    } catch { alert('Could not read file.'); }
  };

  const handleFileClose = (index: number) => {
    setPendingDiff(null);
    setOpenFiles(prev => { const n = [...prev]; n.splice(index, 1); return n; });
    setActiveFileIndex(prev => openFiles.length <= 1 ? -1 : Math.max(0, index > prev ? prev : prev - 1));
  };

  const handleContentChange = (content: string | undefined) => {
    if (content === undefined || activeFileIndex === -1) return;
    setOpenFiles(prev => {
      const n = [...prev];
      n[activeFileIndex] = { ...n[activeFileIndex], content, isDirty: true };
      return n;
    });
  };

  const handleSave = async () => {
    if (activeFileIndex === -1) return;
    const f = openFiles[activeFileIndex];
    try {
      await saveFileContent(f.handle, f.content);
      setOpenFiles(prev => { const n = [...prev]; n[activeFileIndex].isDirty = false; return n; });
    } catch { alert('Could not save file.'); }
  };

  const handleRunCode = async () => {
    if (activeFileIndex === -1) return;
    const f = openFiles[activeFileIndex];
    setIsTerminalOpen(true);
    setIsExecuting(true);
    const header = f.language === 'python' && !(window as any)._pyodideInstance
      ? `\n> Running ${f.name} [${f.language}]...\n  (Loading Python runtime, ~10s first run...)\n`
      : `\n> Running ${f.name} [${f.language}]...\n`;
    setTerminalOutput(prev => prev + header);
    try {
      const result = await executeCode(f.language, f.content);
      setTerminalOutput(prev => prev + result.output + `\n[Exited with code ${result.code}]\n`);
    } catch (e: any) {
      setTerminalOutput(prev => prev + `\n[Error] ${e.message}\n`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApplyCode = async (code: string) => {
    if (!editorInstance) {
      alert("Please open a file in the editor first.");
      return;
    }
    
    if (activeFileIndex === -1) return;
    const activeFile = openFiles[activeFileIndex];

    const selection = editorInstance.getSelection();
    const hasRealSelection = selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn);

    if (hasRealSelection) {
      const model = editorInstance.getModel();
      const startOffset = model.getOffsetAt(selection.getStartPosition());
      const endOffset = model.getOffsetAt(selection.getEndPosition());
      const newContent = activeFile.content.substring(0, startOffset) + code + activeFile.content.substring(endOffset);

      setPendingDiff({
        original: activeFile.content,
        modified: newContent
      });
      return;
    }

    if (!settings.apiKey) {
      alert('Set your Gemini API key in settings to use Smart Apply.');
      setIsSettingsOpen(true);
      return;
    }

    setLoadingText('Merging...');
    // We don't set isLoading(true) here so we don't block the UI, the diff editor itself will show the streaming
    // Let's instantly open the diff view so it feels fast
    let currentMerged = '';
    setPendingDiff({
      original: activeFile.content,
      modified: currentMerged
    });

    try {
      const systemPrompt = `You are an expert coding assistant. Merge the provided code snippet into the provided file content intelligently.
Rules:
1. Replace existing functions if they overlap.
2. Insert new ones at a logical place (e.g., end of the file).
3. Do NOT add markdown formatting. Output ONLY the raw file content. No \`\`\` language tags, no explanations.
4. Ensure the resulting code is syntactically correct and fully intact.`;

      const prompt = `File: ${activeFile.name}\nLanguage: ${activeFile.language}\n\n=== CURRENT FILE CONTENT ===\n${activeFile.content}\n\n=== CODE TO MERGE ===\n${code}\n\n=== OUTPUT ONLY THE RAW FINAL MERGED FILE CONTENT ===`;

      await streamGemini(
        [{ role: 'user', content: prompt }],
        systemPrompt,
        settings.apiKey,
        settings.model,
        (chunk) => {
          currentMerged += chunk;
          setPendingDiff(prev => {
            if (!prev) return null; // If user closed it
            return {
              original: prev.original,
              modified: currentMerged.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '')
            };
          });
        }
      );
    } catch (e: any) {
      alert(`Smart Apply failed: ${e.message}`);
    } finally {
      setIsLoading(false);
      setLoadingText('Thinking...');
    }
  };

  const handleAcceptDiff = () => {
    if (pendingDiff && activeFileIndex !== -1) {
      handleContentChange(pendingDiff.modified);
    }
    setPendingDiff(null);
  };

  const handleRejectDiff = () => {
    setPendingDiff(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!settings.apiKey) { alert('Set your Gemini API key in settings.'); setIsSettingsOpen(true); return; }

    setIsLoading(true); // Start loading earlier for SLM check
    setLoadingText('Thinking...');

    // ── 1. Optional SLM Check (Ollama) ──
    let slmResult: SlmCheckResult = { safe: true, reason: '', violations: [], skipped: true, latencyMs: 0 };
    if (settings.firewall.slm?.enabled) {
      setLoadingText(`Checking SLM Guard (${settings.firewall.slm.model})...`);
      
      slmResult = await checkPromptWithSlm(text, settings.firewall.slm);
      console.log('[SLM Result]', slmResult);
      
      if (slmResult.skipped) {
        const warningMsg: Message = { role: 'system', content: `_⚠️ SLM Guard failed open: ${slmResult.reason}_` };
        setMessages(prev => [...prev, warningMsg]);
        // Remove warning after 5 seconds
        setTimeout(() => setMessages(prev => prev.filter(m => m !== warningMsg)), 5000);
      }

      if (!slmResult.safe && !slmResult.skipped) {
        setIsLoading(false);
        setLoadingText('Thinking...');
        const uid = (user as User | null)?.uid;
        if (uid) writeAuditLog(uid, { type: 'prompt_slm_block', originalLength: text.length, violations: slmResult.violations });
        
        setMessages(prev => [...prev, 
          { role: 'user', content: text },
          { role: 'system', content: `**🚫 Blocked by SLM Guard**\nReason: ${slmResult.reason}\nViolations: ${slmResult.violations.join(', ')}` }
        ]);
        return;
      }
    }
    setLoadingText('Thinking...');

    // ── 2. Rule-based Firewall Check ──
    const firewallResult = runFirewall(text, settings.firewall);

    // Log to Firestore if user is signed in
    const uid = (user as User | null)?.uid;
    if (uid) {
      writeAuditLog(uid, {
        type: 'prompt',
        originalLength: text.length,
        verdict: firewallResult.passed ? 'PASSED' : 'BLOCKED',
        blockedBy: firewallResult.blockedBy || null,
        slmLatency: slmResult.latencyMs,
      });
    }

    if (!firewallResult.passed) { 
      setIsLoading(false);
      alert(`Blocked: ${firewallResult.blockedBy}`); 
      return; 
    }

    const payloadText = firewallResult.sanitizedText;
    const userMessage: Message = { role: 'user', content: payloadText };
    const cleanHistory = messages.filter(m => !m.content.startsWith('__INDEXED__'));
    const updatedHistory = [...cleanHistory, userMessage];
    setMessages(prev => [...prev, userMessage]);

    const systemPrompt = buildAgentSystemPrompt(
      workspaceIndex,
      settings.workspace.autoAttachOpenFiles ? openFiles : []
    );

    try {
      const placeholder: Message = { role: 'model', content: '' };
      setMessages(prev => [...prev, placeholder]);

      await streamGemini(updatedHistory, systemPrompt, settings.apiKey, settings.model, (chunk) => {
        setMessages(prev => {
          const n = [...prev];
          const last = n.length - 1;
          const fw = runFirewall(chunk, settings.firewall);
          n[last] = { ...n[last], content: n[last].content + fw.sanitizedText };
          return n;
        });
      });

      // Log response
      if (uid) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          writeAuditLog(uid, { type: 'response', length: lastMsg.content.length });
          return prev;
        });
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  // Show loading spinner while Firebase resolves auth state
  if (user === 'loading') {
    return (
      <div className="h-screen w-screen bg-[#0A0C14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading RelantoIDE...</span>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (user === null) {
    return <AuthPage onAuth={() => {}} />;
  }

  const currentUser = user as User;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-text-main font-sans">
      {/* Title Bar */}
      <div className="h-8 bg-[#0F111A] flex items-center px-3 border-b border-border select-none window-drag flex-shrink-0">
        <div className="flex space-x-2 mr-4">
          <button onClick={() => signOut()} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" title="Sign out" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="text-xs font-semibold tracking-wider text-text-muted flex-1 text-center">
          RelantoIDE {folderName ? `— ${folderName}` : ''}
          {workspaceIndex && <span className="ml-2 text-cyan-400 font-normal">· {workspaceIndex.totalFiles} files indexed</span>}
        </div>
        <div className="text-[10px] text-text-muted flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          {currentUser.displayName || currentUser.email}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar files={files} onFileSelect={handleFileSelect} onOpenFolder={handleOpenFolder} folderName={folderName} />
        <Editor
          openFiles={openFiles}
          activeFileIndex={activeFileIndex}
          onFileClose={handleFileClose}
          onFileSelect={(idx) => {
            setActiveFileIndex(idx);
            setPendingDiff(null);
          }}
          onContentChange={handleContentChange}
          onSave={handleSave}
          onRun={handleRunCode}
          settings={settings}
          onEditorMount={(editor) => setEditorInstance(editor)}
          pendingDiff={pendingDiff}
          onAcceptDiff={handleAcceptDiff}
          onRejectDiff={handleRejectDiff}
        />
        <Copilot
          messages={messages}
          onSendMessage={handleSendMessage}
          onClearChat={() => setMessages([])}
          openFiles={openFiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
          isLoading={isLoading}
          workspaceIndex={workspaceIndex}
          isIndexing={isIndexing}
          indexingProgress={indexingProgress}
          onIndexWorkspace={handleIndexWorkspace}
          loadingText={loadingText}
          onToggleSlm={(enabled) => setSettings(prev => ({
            ...prev,
            firewall: { ...prev.firewall, slm: { ...prev.firewall.slm, enabled } }
          }))}
          onApplyCode={handleApplyCode}
        />

        <Terminal
          isOpen={isTerminalOpen}
          onClose={() => setIsTerminalOpen(false)}
          output={terminalOutput}
          onClear={() => setTerminalOutput('')}
          isLoading={isExecuting}
        />

        {isSettingsOpen && (
          <div className="absolute inset-0 bg-black/50 z-40" onClick={() => setIsSettingsOpen(false)} />
        )}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSettingsChange={setSettings}
          isAdminAuthenticated={isAdminAuthenticated}
          onRequestAdminAccess={() => setIsAdminModalOpen(true)}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        language={activeFileIndex >= 0 ? openFiles[activeFileIndex].language : ''}
        settings={settings}
        onToggleTerminal={() => setIsTerminalOpen(p => !p)}
        isTerminalOpen={isTerminalOpen}
        workspaceIndex={workspaceIndex}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => setIsAdminAuthenticated(true)}
      />
    </div>
  );
}

export default App;
