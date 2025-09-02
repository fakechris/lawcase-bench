import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { TwoFactorSetupResponse } from '../types/auth.js';

export class TwoFactorUtils {
  static generateSecret(): string {
    return speakeasy.generateSecret({
      name: 'LawCase Bench',
      issuer: 'LawCase Bench',
    }).base32!;
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(speakeasy.generateSecret({ length: 8 }).base32!.substring(0, 8));
    }
    return codes;
  }

  static async generateQRCodeUrl(secret: string, email: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: `LawCase Bench:${email}`,
      issuer: 'LawCase Bench',
      encoding: 'base32',
    });

    return QRCode.toDataURL(otpauthUrl);
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2,
    });
  }

  static async setupTwoFactor(email: string): Promise<TwoFactorSetupResponse> {
    const secret = this.generateSecret();
    const qrCodeUrl = await this.generateQRCodeUrl(secret, email);
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  static validateBackupCode(backupCodes: string[], code: string): boolean {
    return backupCodes.includes(code);
  }

  static removeUsedBackupCode(backupCodes: string[], code: string): string[] {
    return backupCodes.filter(bc => bc !== code);
  }
}