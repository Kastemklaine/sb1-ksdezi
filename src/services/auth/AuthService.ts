import { Biometrics } from '@nativescript/biometrics';

export class AuthService {
  private biometrics: Biometrics;

  constructor() {
    this.biometrics = new Biometrics();
  }

  async isBiometricsAvailable(): Promise<boolean> {
    try {
      const result = await this.biometrics.available();
      return result;
    } catch (error) {
      console.error('Biometrics check failed:', error);
      return false;
    }
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await this.biometrics.verifyFingerprintWithCustomFallback({
        message: 'Authenticate to access SingrdBeats',
        fallbackMessage: 'Use PIN instead'
      });
      return result.code === Biometrics.ERROR_CODES.SUCCESS;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }
}