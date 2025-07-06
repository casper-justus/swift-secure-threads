
// End-to-end encryption utilities
export class EncryptionManager {
  private static instance: EncryptionManager;
  private keyPair: CryptoKeyPair | null = null;
  private masterKey: CryptoKey | null = null;

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  // Generate RSA key pair for asymmetric encryption
  async generateKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    this.keyPair = keyPair;
    return keyPair;
  }

  // Export public key to string
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  // Import public key from string
  async importPublicKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
  }

  // Generate AES key for message encryption
  async generateMessageKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypt message with AES key
  async encryptMessage(message: string, key: CryptoKey): Promise<{ encrypted: string; nonce: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const nonce = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: nonce,
      },
      key,
      data
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      nonce: btoa(String.fromCharCode(...nonce)),
    };
  }

  // Decrypt message with AES key
  async decryptMessage(encryptedData: string, nonce: string, key: CryptoKey): Promise<string> {
    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const nonceArray = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonceArray,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  // Encrypt AES key with RSA public key
  async encryptKeyForRecipient(messageKey: CryptoKey, recipientPublicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", messageKey);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      recipientPublicKey,
      exported
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  // Store keys securely in session storage
  setKeyPair(keyPair: CryptoKeyPair) {
    this.keyPair = keyPair;
  }

  getKeyPair(): CryptoKeyPair | null {
    return this.keyPair;
  }
}
