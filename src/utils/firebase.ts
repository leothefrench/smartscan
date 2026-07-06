import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  User,
  signInAnonymously,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Receipt } from '../types';

// Check if configuration is realistic
export const IS_FIREBASE_REAL =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'PLACEHOLDER_KEY';

let app;
let authInstance: any = null;
let dbInstance: any = null;

if (IS_FIREBASE_REAL) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      // Force HTTP long-polling to prevent WebSocket connection failures on mobile devices, VPNs, and in-app webviews
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      dbInstance = getFirestore(
        app,
        firebaseConfig.firestoreDatabaseId || '(default)',
      );
    }
    authInstance = getAuth(app);
    // Silent anonymous auth in background to populate request.auth for secure Firestore writes
    signInAnonymously(authInstance).catch((err) => {
      console.warn(
        'Silent anonymous sign-in failed or anonymous provider is not enabled in Firebase console yet:',
        err,
      );
    });
  } catch (error) {
    console.warn(
      "Erreur d'initialisation de Firebase, repli sur le stockage local :",
      error,
    );
  }
}

export const auth = authInstance;
export const db = dbInstance;

// Required error reporting structures as per high-integrity standards
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || 'NO_USER',
      email: currentAuth?.currentUser?.email || 'NO_EMAIL',
      emailVerified: currentAuth?.currentUser?.emailVerified || false,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || false,
      tenantId: currentAuth?.currentUser?.tenantId || null,
      providerInfo:
        currentAuth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore statically
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  if (!IS_FIREBASE_REAL || !db) return false;
  try {
    // Check if the client is connected
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error(
        'Please check your Firebase configuration or network connectivity.',
      );
    }
    return false;
  }
}

/**
 * Sync helper: Fetch all receipts stored under user subcollection
 */
export async function fetchUserReceipts(userId: string): Promise<Receipt[]> {
  // Try calling our ultra-reliable backend REST proxy API first!
  try {
    const res = await fetch(`/api/users/${userId}/receipts`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.receipts)) {
        return data.receipts;
      }
    }
  } catch (apiErr) {
    console.warn(
      'API fetch receipts failed, trying client SDK fallback:',
      apiErr,
    );
  }

  if (!IS_FIREBASE_REAL || !db) return [];
  const colPath = `users/${userId}/receipts`;
  try {
    const qSnapshot = await getDocs(collection(db, colPath));
    const items: Receipt[] = [];
    qSnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as Receipt);
    });
    // Sort by scanned date descending
    return items.sort(
      (a, b) =>
        new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
    return [];
  }
}

/**
 * Sync helper: Save single receipt to Firestore
 */
export async function saveUserReceiptToCloud(
  userId: string,
  receipt: Receipt,
): Promise<void> {
  // Try calling our ultra-reliable backend REST proxy API first!
  try {
    const res = await fetch(`/api/users/${userId}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt }),
    });
    if (res.ok) {
      return;
    }
  } catch (apiErr) {
    console.warn(
      'API save receipt failed, trying client SDK fallback:',
      apiErr,
    );
  }

  if (!IS_FIREBASE_REAL || !db) return;
  const docPath = `users/${userId}/receipts/${receipt.id}`;
  try {
    await setDoc(doc(db, docPath), receipt);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

/**
 * Sync helper: Delete single receipt from Firestore
 */
export async function deleteUserReceiptFromCloud(
  userId: string,
  receiptId: string,
): Promise<void> {
  // Try calling our ultra-reliable backend REST proxy API first!
  try {
    const res = await fetch(`/api/users/${userId}/receipts/${receiptId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return;
    }
  } catch (apiErr) {
    console.warn(
      'API delete receipt failed, trying client SDK fallback:',
      apiErr,
    );
  }

  if (!IS_FIREBASE_REAL || !db) return;
  const docPath = `users/${userId}/receipts/${receiptId}`;
  try {
    await deleteDoc(doc(db, docPath));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

/**
 * Bulk Sync: Send unsynced local receipts to Cloud
 */
export async function syncLocalReceiptsToCloud(
  userId: string,
  localReceipts: Receipt[],
): Promise<Receipt[]> {
  // Try calling our ultra-reliable backend REST bulk sync API first!
  try {
    const res = await fetch(`/api/users/${userId}/receipts/bulk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipts: localReceipts }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.receipts)) {
        return data.receipts;
      }
    }
  } catch (apiErr) {
    console.warn('API bulk sync failed, trying client SDK fallback:', apiErr);
  }

  if (!IS_FIREBASE_REAL || !db) return localReceipts;

  try {
    // 1. Fetch current cloud state
    const cloudReceipts = await fetchUserReceipts(userId);
    const cloudIds = new Set(cloudReceipts.map((r) => r.id));

    // 2. Upload missing ones
    for (const local of localReceipts) {
      if (!cloudIds.has(local.id)) {
        await saveUserReceiptToCloud(userId, local);
      }
    }

    // 3. Re-fetch final unified list
    return await fetchUserReceipts(userId);
  } catch (err) {
    console.error('Erreur de synchronisation globale :', err);
    return localReceipts;
  }
}

/**
 * Save user custom premium subscription status in Firestore
 */
export async function saveUserPremiumStatus(
  userId: string,
  isPremium: boolean,
): Promise<void> {
  // Try calling our ultra-reliable backend REST proxy API first!
  try {
    const res = await fetch(`/api/users/${userId}/premium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPremium }),
    });
    if (res.ok) {
      console.log(
        `[SmartReceipt API] Premium status updated to ${isPremium} via API for ${userId}`,
      );
      return;
    }
  } catch (apiErr) {
    console.warn(
      'API save premium failed, trying client SDK fallback:',
      apiErr,
    );
  }

  if (!IS_FIREBASE_REAL || !db) return;
  const docPath = `users/${userId}`;
  try {
    await setDoc(doc(db, docPath), { isPremium }, { merge: true });
    console.log(
      `[SmartReceipt SDK] Premium status updated to ${isPremium} in Cloud for ${userId}`,
    );
  } catch (err) {
    console.warn("Erreur d'enregistrement premium sur Firestore :", err);
    throw err;
  }
}

/**
 * Fetch user custom premium subscription status from Firestore
 */
export async function fetchUserPremiumStatus(userId: string): Promise<boolean> {
  // Try calling our ultra-reliable backend REST proxy API first!
  try {
    const res = await fetch(`/api/users/${userId}/premium`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return !!data.isPremium;
      }
    }
  } catch (apiErr) {
    console.warn(
      'API fetch premium failed, trying client SDK fallback:',
      apiErr,
    );
  }

  if (!IS_FIREBASE_REAL || !db) return false;
  const docPath = `users/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, docPath));
    if (docSnap.exists()) {
      return !!docSnap.data()?.isPremium;
    }
  } catch (err) {
    console.warn('Erreur de récupération premium depuis Firestore :', err);
  }
  return false;
}
