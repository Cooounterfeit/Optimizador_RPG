import { AuthError } from './auth-service';
import { copy } from '../catalog/copy';

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return copy.auth.errors[error.code] ?? copy.auth.errors.unknown;
  }
  return copy.auth.errors.unknown;
}
