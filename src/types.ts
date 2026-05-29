export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  path: string;
  handle: FileSystemHandle;
  children?: FileNode[];
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  handle: FileSystemFileHandle;
  language: string;
  isDirty?: boolean;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  slmVerified?: boolean;
}

export interface SlmSettings {
  enabled: boolean;        // User-toggled per session
  endpoint: string;        // Admin: default http://localhost:11434
  model: string;           // Admin: default phi3
  systemPrompt: string;    // Admin: editable guard-rail prompt
  checkWebScrapes: boolean; // Pre-screen scraped web data via SLM
}

export interface FirewallSettings {
  enabled: boolean;
  mode: 'block' | 'warn';
  rules: {
    emails: boolean;
    phones: boolean;
    creditCards: boolean;
    apiKeys: boolean;
    ssn: boolean;
  };
  customRules: string[];
  slm: SlmSettings;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  maxTokens: number;
  firewall: FirewallSettings;
  workspace: {
    autoAttachOpenFiles: boolean;
    sendFileTree: boolean;
    workspaceIndexing: boolean;
  };
  appearance: {
    fontSize: number;
    fontFamily: string;
  };
}

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
