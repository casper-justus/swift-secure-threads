
// Client-side encryption utilities for second layer of encryption
export class ClientEncryption {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async generateMasterKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptMasterKey(masterKey: CryptoKey, password: string): Promise<{
    encryptedKey: string;
    salt: string;
    iv: string;
  }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const derivedKey = await this.deriveKey(password, salt);
    
    const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      exportedKey
    );

    return {
      encryptedKey: Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decryptMasterKey(encryptedData: {
    encryptedKey: string;
    salt: string;
    iv: string;
  }, password: string): Promise<CryptoKey> {
    const salt = new Uint8Array(encryptedData.salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedKey = new Uint8Array(encryptedData.encryptedKey.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const derivedKey = await this.deriveKey(password, salt);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encryptedKey
    );

    return crypto.subtle.importKey(
      'raw',
      decryptedBuffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptMessage(message: string, masterKey: CryptoKey): Promise<{
    encryptedContent: string;
    iv: string;
  }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      encoder.encode(message)
    );

    return {
      encryptedContent: Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decryptMessage(encryptedData: {
    encryptedContent: string;
    iv: string;
  }, masterKey: CryptoKey): Promise<string> {
    const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedContent = new Uint8Array(encryptedData.encryptedContent.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      encryptedContent
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}
