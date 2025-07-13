import crypto from 'crypto';
import { config } from '../config/config';

export interface EncryptedToken {
  encrypted: string;
  iv: string;
}

export class TokenEncryptionService {
  private static instance: TokenEncryptionService;
  private algorithm: string;
  private key: Buffer;
  private ivLength: number;

  private constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = Buffer.from(config.encryption.secretKey, 'utf8');
    this.ivLength = 16;
  }

  public static getInstance(): TokenEncryptionService {
    if (!TokenEncryptionService.instance) {
      TokenEncryptionService.instance = new TokenEncryptionService();
    }
    return TokenEncryptionService.instance;
  }

  public encryptToken(token: string): EncryptedToken {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  public decryptToken(encryptedToken: EncryptedToken): string {
    const iv = Buffer.from(encryptedToken.iv, 'hex');
    const encrypted = Buffer.from(encryptedToken.encrypted, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  public isTokenExpired(expiresAt: Date): boolean {
    return new Date() >= expiresAt;
  }

  public shouldRefreshToken(expiresAt: Date, bufferMinutes: number = 5): boolean {
    const bufferTime = new Date(expiresAt.getTime() - (bufferMinutes * 60 * 1000));
    return new Date() >= bufferTime;
  }
} 