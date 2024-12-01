import { useState, useCallback } from 'react';
import { AuthService } from '../services/auth/AuthService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authService = new AuthService();

  const authenticate = useCallback(async () => {
    const biometricsAvailable = await authService.isBiometricsAvailable();
    if (biometricsAvailable) {
      const success = await authService.authenticateWithBiometrics();
      setIsAuthenticated(success);
      return success;
    }
    return false;
  }, []);

  return {
    isAuthenticated,
    authenticate
  };
}