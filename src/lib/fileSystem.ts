import type { FileNode } from '../types';

export const getLanguageFromExtension = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'py':
      return 'python';
    case 'md':
      return 'markdown';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
    case 'h':
      return 'cpp';
    default:
      return 'plaintext';
  }
};

export const readDirectoryRecursive = async (dirHandle: FileSystemDirectoryHandle, path = ''): Promise<FileNode[]> => {
  const nodes: FileNode[] = [];
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      nodes.push({
        name: entry.name,
        kind: 'file',
        path: fullPath,
        handle: entry
      });
    } else if (entry.kind === 'directory') {
      nodes.push({
        name: entry.name,
        kind: 'directory',
        path: fullPath,
        handle: entry,
        children: await readDirectoryRecursive(entry as FileSystemDirectoryHandle, fullPath)
      });
    }
  }
  // Sort: directories first, then files
  nodes.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
  return nodes;
};

export const readFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  return await file.text();
};

export const saveFileContent = async (fileHandle: FileSystemFileHandle, content: string): Promise<void> => {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

export const appendToAuditLog = async (dirHandle: FileSystemDirectoryHandle | null, entry: any) => {
  if (!dirHandle) return;
  try {
    const fileHandle = await dirHandle.getFileHandle('audit_log.jsonl', { create: true });
    
    // FileSystem API doesn't support append easily without reading all or seeking
    // Let's get current size and create writable, then seek to end.
    const file = await fileHandle.getFile();
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    
    const entryString = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
    await writable.write({ type: 'write', data: entryString, position: file.size });
    await writable.close();
  } catch (e) {
    console.error('Failed to write to audit log', e);
  }
};
