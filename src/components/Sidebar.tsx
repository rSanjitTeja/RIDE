import { useState } from 'react';
import type { FileNode } from '../types';
import { FolderOpen, File as FileIcon, ChevronRight, ChevronDown, FileJson, FileCode2, FileType2, Image } from 'lucide-react';

interface SidebarProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onOpenFolder: () => void;
  folderName: string | null;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return <FileJson size={16} className="text-yellow-400" />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx': return <FileCode2 size={16} className="text-blue-400" />;
    case 'css':
    case 'html': return <FileType2 size={16} className="text-orange-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg': return <Image size={16} className="text-green-400" />;
    default: return <FileIcon size={16} className="text-gray-400" />;
  }
};

const FileTreeItem: React.FC<{ node: FileNode; onSelect: (n: FileNode) => void; depth: number }> = ({ node, onSelect, depth }) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (node.kind === 'directory') {
      setExpanded(!expanded);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <div 
        className="flex items-center py-1 px-2 hover:bg-surface cursor-pointer text-sm"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        <div className="mr-1 w-4 h-4 flex items-center justify-center">
          {node.kind === 'directory' && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
        <div className="mr-2">
          {node.kind === 'directory' ? <FolderOpen size={16} className="text-blue-300" /> : getFileIcon(node.name)}
        </div>
        <span className="truncate">{node.name}</span>
      </div>
      {node.kind === 'directory' && expanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FileTreeItem key={i} node={child} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ files, onFileSelect, onOpenFolder, folderName }) => {
  return (
    <div className="w-[200px] h-full flex flex-col bg-[#0F111A] border-r border-border">
      <div className="p-3 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border flex justify-between items-center">
        <span>Explorer</span>
        <button onClick={onOpenFolder} className="hover:text-text-main transition-colors" title="Open Folder">
          <FolderOpen size={14} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {!folderName ? (
          <div className="p-4 text-center text-sm text-text-muted">
            <p className="mb-4">No folder opened.</p>
            <button 
              onClick={onOpenFolder}
              className="bg-primary hover:bg-opacity-80 text-white py-1 px-3 rounded transition-colors"
            >
              Open Folder
            </button>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-3 py-1 text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              {folderName}
            </div>
            {files.map((file, i) => (
              <FileTreeItem key={i} node={file} onSelect={onFileSelect} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
