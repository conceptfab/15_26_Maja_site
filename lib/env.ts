function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getJwtSecret() {
  const jwtSecret = readRequiredEnv('JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return new TextEncoder().encode(jwtSecret);
}

export function getAdminSecretCode() {
  const adminSecretCode = readRequiredEnv('ADMIN_SECRET_CODE');

  if (adminSecretCode.length < 12) {
    throw new Error('ADMIN_SECRET_CODE must be at least 12 characters long');
  }

  return adminSecretCode;
}

export function getSeedAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim() || 'admin@example.com';
}
