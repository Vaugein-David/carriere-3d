import { signatureConfig } from '../data/signature';

export interface SignedRecord {
  version: string;
  date: string;
}

const KEY = 'carriere-signature';

/** Identifiant de requête (crypto.randomUUID manque sur les téléphones anciens) */
export function newRequestId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Dernière signature faite sur ce téléphone, si elle porte sur la version en cours */
export function readSigned(): SignedRecord | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SignedRecord | null;
    return r?.version === signatureConfig.version ? r : null;
  } catch {
    return null;
  }
}

export function saveSigned(r: SignedRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* le code reste affiché, il ne sera simplement pas retrouvé plus tard */
  }
}
