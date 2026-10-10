const APP_KEY_MATERIAL = 'ville-hauteur-enfant-quimperle-2024';

let _key: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(APP_KEY_MATERIAL), 'PBKDF2', false, ['deriveKey']
  );
  _key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('qkemperle'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return _key;
}

export async function encryptText(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptText(encoded: string): Promise<string> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(dec);
  } catch {
    return encoded; // fallback: return as-is if not encrypted (legacy data)
  }
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > 12;
  } catch {
    return false;
  }
}

/* ============================================================
   Password hashing (PBKDF2-SHA256, per-user salt).
   Stored format: "pbkdf2$<salt>$<hash>". Passwords are never kept
   in clear text. Legacy plaintext entries are migrated on first login.
   ============================================================ */

function randomSalt(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...a));
}

async function pbkdf2(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

/** Returns true if the stored value is already a hashed record. */
export function isHashedPassword(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith('pbkdf2$');
}

/** Produce a salted hash record to store instead of the plain password. */
export async function makePasswordRecord(password: string): Promise<string> {
  const salt = randomSalt();
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${salt}$${hash}`;
}

/** Verify a password against a stored record (hashed or legacy plaintext). */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  if (isHashedPassword(stored)) {
    const [, salt, hash] = stored.split('$');
    const h = await pbkdf2(password, salt);
    return h === hash;
  }
  return stored === password; // legacy plaintext
}
