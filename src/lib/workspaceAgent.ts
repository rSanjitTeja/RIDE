import type { FileNode } from '../types';
import { getLanguageFromExtension } from './fileSystem';

export interface IndexedFile {
  path: string;
  name: string;
  language: string;
  content: string;
  lines: number;
  size: number;
}

export interface WorkspaceIndex {
  files: IndexedFile[];
  totalFiles: number;
  totalLines: number;
  indexedAt: Date;
  folderName: string;
}

// Max chars per file and total to keep within Gemini's context window
const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 100_000;

const SKIP_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'wav', 'ogg', 'mov', 'avi',
  'zip', 'tar', 'gz', 'rar', '7z',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'lock', 'map',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.cache',
  '__pycache__', '.venv', 'venv', '.pytest_cache', 'coverage',
  '.turbo', 'out', '.output',
]);

async function collectFiles(
  nodes: FileNode[],
  onProgress: (count: number) => void,
  count = { n: 0 }
): Promise<IndexedFile[]> {
  const results: IndexedFile[] = [];

  for (const node of nodes) {
    if (node.kind === 'directory') {
      if (SKIP_DIRS.has(node.name)) continue;
      if (node.children) {
        const children = await collectFiles(node.children, onProgress, count);
        results.push(...children);
      }
    } else {
      const ext = node.name.split('.').pop()?.toLowerCase() || '';
      if (SKIP_EXTENSIONS.has(ext)) continue;

      try {
        const file = await (node.handle as FileSystemFileHandle).getFile();
        const raw = await file.text();
        const content = raw.length > MAX_FILE_CHARS
          ? raw.slice(0, MAX_FILE_CHARS) + '\n// ... [truncated — file too large]'
          : raw;

        results.push({
          path: node.path,
          name: node.name,
          language: getLanguageFromExtension(node.name),
          content,
          lines: raw.split('\n').length,
          size: raw.length,
        });

        count.n++;
        onProgress(count.n);
      } catch {
        // Skip unreadable files silently
      }
    }
  }

  return results;
}

function prioritizeFiles(files: IndexedFile[]): IndexedFile[] {
  const SOURCE_EXTS = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'cs', 'rb', 'php'];
  return [...files].sort((a, b) => {
    const aExt = a.name.split('.').pop() || '';
    const bExt = b.name.split('.').pop() || '';
    const aIdx = SOURCE_EXTS.indexOf(aExt);
    const bIdx = SOURCE_EXTS.indexOf(bExt);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.path.localeCompare(b.path);
  });
}

export async function indexWorkspace(
  nodes: FileNode[],
  folderName: string,
  onProgress?: (count: number) => void
): Promise<WorkspaceIndex> {
  const progress = onProgress ?? (() => {});
  const files = await collectFiles(nodes, progress);
  const sorted = prioritizeFiles(files);

  return {
    files: sorted,
    totalFiles: sorted.length,
    totalLines: sorted.reduce((acc, f) => acc + f.lines, 0),
    indexedAt: new Date(),
    folderName,
  };
}

export function buildAgentSystemPrompt(
  index: WorkspaceIndex | null,
  openFiles: { name: string; language: string; content: string }[]
): string {
  const now = new Date().toLocaleString();

  let prompt = `You are an expert AI coding agent named Copilot, embedded inside RelantoIDE.
Today's date/time: ${now}

Your role:
- You have FULL knowledge of the user's codebase (see WORKSPACE CONTEXT below)
- Answer questions specifically about their code — reference actual function names, files, and lines
- Write, refactor, and debug code in context
- Explain architecture, patterns, and dependencies
- Suggest improvements grounded in the actual codebase
- Be concise but thorough. Always cite the relevant file when referencing code.

Behavior rules:
- If you write code, wrap it in fenced code blocks with the language tag
- If the user asks about a specific file, use the indexed content to give a precise answer
- If something is not in the index, say so honestly
- Maintain memory of the conversation above — do not repeat previous answers\n`;

  if (index) {
    prompt += `
=== WORKSPACE: "${index.folderName}" ===
Indexed: ${index.totalFiles} files | ${index.totalLines.toLocaleString()} total lines | ${index.indexedAt.toLocaleTimeString()}

--- DIRECTORY STRUCTURE ---
`;
    // Build compact file tree
    index.files.forEach(f => {
      prompt += `  ${f.path}  (${f.language}, ${f.lines} lines)\n`;
    });

    // Include file contents up to budget
    let charsUsed = prompt.length;
    prompt += '\n--- SOURCE FILES ---\n';

    for (const file of index.files) {
      if (charsUsed > MAX_TOTAL_CHARS) {
        prompt += `\n[Context budget reached — ${index.totalFiles - index.files.indexOf(file)} more files not shown]\n`;
        break;
      }
      prompt += `\n### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
      charsUsed += file.content.length + 50;
    }
  } else {
    prompt += '\n[No workspace indexed yet. User has not opened a folder or triggered indexing.]\n';
  }

  // Always prioritize currently open files (most up-to-date)
  if (openFiles.length > 0) {
    prompt += '\n=== CURRENTLY ACTIVE FILES (most recent edits — highest priority) ===\n';
    openFiles.forEach(f => {
      prompt += `\n### ${f.name} [OPEN]\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n`;
    });
  }

  return prompt;
}
