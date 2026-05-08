import MonacoEditor from '@monaco-editor/react';
import type { OpenFile } from '../types';
import { X } from 'lucide-react';

interface EditorProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onFileClose: (index: number) => void;
  onFileSelect: (index: number) => void;
  onContentChange: (content: string | undefined) => void;
  onSave: () => void;
  settings: any;
}

export const Editor: React.FC<EditorProps> = ({
  openFiles,
  activeFileIndex,
  onFileClose,
  onFileSelect,
  onContentChange,
  onSave,
  settings
}) => {
  const activeFile = openFiles[activeFileIndex];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1A1D27] h-full border-r border-border">
      {/* Tabs */}
      <div className="flex overflow-x-auto bg-[#0F111A] border-b border-border hide-scrollbar">
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

      {/* Editor Space */}
      <div className="flex-1 w-full relative">
        {openFiles.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-20">NeuralIDE</div>
              <p>Open a file to start editing</p>
              <p className="text-xs mt-2 opacity-50">Cmd/Ctrl + S to save</p>
            </div>
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
            }}
            onMount={(editor, monaco) => {
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                onSave();
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
