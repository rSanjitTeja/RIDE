import MonacoEditor, { DiffEditor } from '@monaco-editor/react';
import type { OpenFile } from '../types';
import { X, Play, Check, XCircle } from 'lucide-react';

interface EditorProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onFileClose: (index: number) => void;
  onFileSelect: (index: number) => void;
  onContentChange: (content: string | undefined) => void;
  onSave: () => void;
  onRun: () => void;
  settings: any;
  onEditorMount?: (editor: any, monaco: any) => void;
  pendingDiff?: { original: string; modified: string } | null;
  onAcceptDiff?: () => void;
  onRejectDiff?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  openFiles,
  activeFileIndex,
  onFileClose,
  onFileSelect,
  onContentChange,
  onSave,
  onRun,
  settings,
  onEditorMount,
  pendingDiff,
  onAcceptDiff,
  onRejectDiff
}) => {
  const activeFile = openFiles[activeFileIndex];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1A1D27] h-full border-r border-border">
      {/* Tabs */}
      <div className="flex items-center justify-between bg-[#0F111A] border-b border-border">
        <div className="flex overflow-x-auto hide-scrollbar">
          {openFiles.map((file, i) => (
            <div 
              key={i}
              className={`flex items-center px-4 py-2 text-sm cursor-pointer border-r border-border min-w-max transition-colors ${i === activeFileIndex ? 'bg-[#1A1D27] text-accent border-t-2 border-t-accent' : 'text-text-muted hover:bg-surface'}`}
              onClick={() => onFileSelect(i)}
            >
              <span className="mr-2">{file.name}{file.isDirty ? ' •' : ''}</span>
              <button 
                className="hover:bg-[#2E3246] rounded p-0.5 text-text-muted hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(i);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {openFiles.length > 0 && (
          <div className="px-2 flex items-center">
            <button 
              onClick={onRun}
              className="flex items-center space-x-1.5 px-3 py-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md transition-all text-xs font-bold uppercase tracking-wider"
              title="Run Code (Ctrl+Enter)"
            >
              <Play size={12} fill="currentColor" />
              <span>Run</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Space */}
      <div className="flex-1 w-full relative">
        {openFiles.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-20 font-bold tracking-tight">RelantoIDE</div>
              <div className="space-y-2 opacity-60 text-sm">
                <p>Select a file from the sidebar to start</p>
                <div className="flex flex-col items-center gap-1 mt-4 text-[11px] font-mono">
                  <div className="flex gap-4">
                    <span className="text-accent">Ctrl + S</span>
                    <span className="text-text-muted">Save File</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-accent">Ctrl + Enter</span>
                    <span className="text-text-muted">Run Code</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : pendingDiff ? (
          <div className="relative h-full w-full flex flex-col bg-[#1E1E1E]">
            <div className="absolute top-4 right-8 z-10 flex gap-2 shadow-xl bg-[#0F111A] p-1 rounded border border-border">
              <button onClick={onAcceptDiff} className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded transition-all text-xs font-semibold">
                <Check size={14} /> Accept
              </button>
              <button onClick={onRejectDiff} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded transition-all text-xs font-semibold">
                <XCircle size={14} /> Reject
              </button>
            </div>
            <DiffEditor
              theme="vs-dark"
              language={activeFile.language}
              original={pendingDiff.original}
              modified={pendingDiff.modified}
              options={{
                renderSideBySide: false, // Inline diff!
                fontSize: settings.appearance.fontSize,
                fontFamily: settings.appearance.fontFamily,
                minimap: { enabled: false },
                wordWrap: 'on',
                padding: { top: 16 },
                readOnly: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        ) : (
          <MonacoEditor
            theme="vs-dark"
            language={activeFile.language}
            value={activeFile.content}
            onChange={onContentChange}
            options={{
              fontSize: settings.appearance.fontSize,
              fontFamily: settings.appearance.fontFamily,
              minimap: { enabled: true },
              wordWrap: 'on',
              padding: { top: 16 },
              bracketPairColorization: { enabled: true },
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              contextmenu: true,
              quickSuggestions: true,
            }}
            onMount={(editor, monaco) => {
              if (onEditorMount) {
                onEditorMount(editor, monaco);
              }
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                onSave();
              });
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                onRun();
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
