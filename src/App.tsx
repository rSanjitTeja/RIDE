import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Copilot } from './components/Copilot';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import type { FileNode, OpenFile, Message, AppSettings } from './types';
import { readDirectoryRecursive, readFileContent, saveFileContent, getLanguageFromExtension, appendToAuditLog } from './lib/fileSystem';
import { runFirewall } from './lib/firewall';
import { streamGemini } from './lib/gemini';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: localStorage.getItem('gemini_api_key') || '',
  model: 'gemini-1.5-pro-latest',
  maxTokens: 2048,
  firewall: {
    enabled: true,
    mode: 'block',
    rules: {
      emails: true,
      phones: true,
      creditCards: true,
      apiKeys: true,
      ssn: true
    },
    customRules: []
  },
  workspace: {
    autoAttachOpenFiles: true,
    sendFileTree: false,
    workspaceIndexing: false
  },
  appearance: {
    fontSize: 14,
    fontFamily: "Consolas, 'Courier New', monospace"
  }
};

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (settings.apiKey) {
      localStorage.setItem('gemini_api_key', settings.apiKey);
    }
  }, [settings.apiKey]);

  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      setFolderName(handle.name);
      const nodes = await readDirectoryRecursive(handle);
      setFiles(nodes);
    } catch (e) {
      console.error('User cancelled or failed to open directory', e);
    }
  };

  const handleFileSelect = async (node: FileNode) => {
    if (node.kind !== 'file') return;
    
    const existingIndex = openFiles.findIndex(f => f.path === node.path);
    if (existingIndex >= 0) {
      setActiveFileIndex(existingIndex);
      return;
    }

    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      const newFile: OpenFile = {
        path: node.path,
        name: node.name,
        content,
        handle: node.handle as FileSystemFileHandle,
        language: getLanguageFromExtension(node.name)
      };
      setOpenFiles([...openFiles, newFile]);
      setActiveFileIndex(openFiles.length);
    } catch (e) {
      console.error('Failed to read file', e);
      alert('Could not read file. Check permissions.');
    }
  };

  const handleFileClose = (index: number) => {
    const newFiles = [...openFiles];
    newFiles.splice(index, 1);
    setOpenFiles(newFiles);
    if (newFiles.length === 0) {
      setActiveFileIndex(-1);
    } else if (activeFileIndex >= index) {
      setActiveFileIndex(Math.max(0, activeFileIndex - 1));
    }
  };

  const handleContentChange = (content: string | undefined) => {
    if (content === undefined || activeFileIndex === -1) return;
    const newFiles = [...openFiles];
    newFiles[activeFileIndex].content = content;
    newFiles[activeFileIndex].isDirty = true;
    setOpenFiles(newFiles);
  };

  const handleSave = async () => {
    if (activeFileIndex === -1) return;
    const activeFile = openFiles[activeFileIndex];
    try {
      await saveFileContent(activeFile.handle, activeFile.content);
      const newFiles = [...openFiles];
      newFiles[activeFileIndex].isDirty = false;
      setOpenFiles(newFiles);
    } catch (e) {
      console.error('Failed to save file', e);
      alert('Could not save file. Check permissions.');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!settings.apiKey) {
      alert('Please set your Gemini API key in settings first.');
      setIsSettingsOpen(true);
      return;
    }

    // Client-side firewall check before sending
    const firewallResult = runFirewall(text, settings.firewall);
    
    // Log to audit log
    await appendToAuditLog(dirHandle, {
      type: 'prompt',
      originalLength: text.length,
      verdict: firewallResult.passed ? 'PASSED' : 'BLOCKED',
      blockedBy: firewallResult.blockedBy,
      sanitizedContent: firewallResult.sanitizedText
    });

    if (!firewallResult.passed) {
      alert(`Prompt blocked by firewall rule: ${firewallResult.blockedBy}`);
      return;
    }

    const payloadText = firewallResult.sanitizedText;
    const userMessage: Message = { role: 'user', content: payloadText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let systemPrompt = "You are NeuralIDE Copilot, an expert AI coding assistant. Help the user write and debug code.";
    if (settings.workspace.autoAttachOpenFiles && openFiles.length > 0) {
      systemPrompt += "\n\nAttached Context Files:\n";
      openFiles.forEach(f => {
        systemPrompt += `--- ${f.name} ---\n${f.content}\n\n`;
      });
    }

    if (settings.workspace.sendFileTree && files.length > 0) {
      const renderTree = (nodes: FileNode[], indent = '') => {
        let tree = '';
        nodes.forEach(n => {
          tree += `${indent}- ${n.name}${n.kind === 'directory' ? '/' : ''}\n`;
          if (n.children) tree += renderTree(n.children, indent + '  ');
        });
        return tree;
      };
      systemPrompt += "\n\nWorkspace File Tree:\n" + renderTree(files);
    }

    try {
      const modelMessage: Message = { role: 'model', content: '' };
      setMessages(prev => [...prev, modelMessage]);

      await streamGemini(payloadText, systemPrompt, settings.apiKey, settings.model, (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          // Firewall on incoming chunk
          const chunkFirewallResult = runFirewall(chunk, settings.firewall);
          
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: newMessages[lastIndex].content + chunkFirewallResult.sanitizedText
          };
          return newMessages;
        });
      });
      
      // Log response to audit log
      setMessages(prev => {
         const lastMsg = prev[prev.length-1];
         appendToAuditLog(dirHandle, {
           type: 'response',
           length: lastMsg.content.length,
         });
         return prev;
      });

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-text-main font-sans">
      {/* Title Bar */}
      <div className="h-8 bg-[#0F111A] flex items-center px-3 border-b border-border select-none window-drag">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs font-semibold tracking-wider text-text-muted flex-1 text-center pr-12">
          NeuralIDE {folderName ? `- ${folderName}` : ''}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar 
          files={files} 
          onFileSelect={handleFileSelect} 
          onOpenFolder={handleOpenFolder} 
          folderName={folderName} 
        />
        <Editor 
          openFiles={openFiles}
          activeFileIndex={activeFileIndex}
          onFileClose={handleFileClose}
          onFileSelect={setActiveFileIndex}
          onContentChange={handleContentChange}
          onSave={handleSave}
          settings={settings}
        />
        <Copilot 
          messages={messages}
          onSendMessage={handleSendMessage}
          openFiles={openFiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
          isLoading={isLoading}
        />
        
        {/* Settings Overlay */}
        {isSettingsOpen && (
          <div className="absolute inset-0 bg-black/50 z-40" onClick={() => setIsSettingsOpen(false)} />
        )}
        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          settings={settings}
          onSettingsChange={setSettings}
        />
      </div>

      {/* Status Bar */}
      <StatusBar 
        language={activeFileIndex >= 0 ? openFiles[activeFileIndex].language : ''} 
        settings={settings} 
      />
    </div>
  );
}

export default App;
