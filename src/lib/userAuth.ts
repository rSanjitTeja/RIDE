import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_SLM_SYSTEM_PROMPT } from './ollamaGuard';
import type { AppSettings } from '../types';

// ── Admin credentials (hardcoded, not stored in Firebase) ──────────────────
export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = '123';

export function checkAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// ── Default settings for new users ─────────────────────────────────────────
export const DEFAULT_USER_SETTINGS: Omit<AppSettings, 'apiKey'> = {
  model: 'gemini-2.5-flash',
  maxTokens: 2048,
  firewall: {
    enabled: true,
    mode: 'block',
    rules: { emails: true, phones: true, creditCards: true, apiKeys: true, ssn: true },
    customRules: [],
    slm: {
      enabled: false,                        // OFF by default
      endpoint: 'http://localhost:11434',
      model: 'phi3',
      systemPrompt: DEFAULT_SLM_SYSTEM_PROMPT,
    },
  },
  workspace: { autoAttachOpenFiles: true, sendFileTree: false, workspaceIndexing: false },
  appearance: { fontSize: 14, fontFamily: "Consolas, 'Courier New', monospace" },
};

// ── Auth ───────────────────────────────────────────────────────────────────
export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Create user document in Firestore
  await setDoc(doc(db, 'users', credential.user.uid), {
    email,
    displayName,
    createdAt: serverTimestamp(),
    settings: {
      ...DEFAULT_USER_SETTINGS,
      apiKey: '',
    },
  });

  return credential.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ── User settings in Firestore ─────────────────────────────────────────────
export async function loadUserSettings(uid: string): Promise<AppSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.settings as AppSettings;
    }
    return null;
  } catch (e) {
    console.error('Failed to load user settings', e);
    return null;
  }
}

export async function saveUserSettings(uid: string, settings: AppSettings): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { settings });
  } catch (e) {
    console.error('Failed to save user settings', e);
  }
}

// ── Audit logs in Firestore ────────────────────────────────────────────────
export async function writeAuditLog(uid: string, entry: Record<string, any>): Promise<void> {
  try {
    const logsRef = doc(db, 'users', uid, 'logs', `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await setDoc(logsRef, {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to write audit log', e);
  }
}
