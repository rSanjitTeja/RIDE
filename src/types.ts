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
