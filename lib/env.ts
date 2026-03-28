function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// Cache na poziomie modułu — enkodowanie raz przy starcie procesu
let _jwtSecret: Uint8Array | null = null;

export function getJwtSecret() {
  if (_jwtSecret) return _jwtSecret;

  const jwtSecret = readRequiredEnv('JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  _jwtSecret = new TextEncoder().encode(jwtSecret);
  return _jwtSecret;
}

let _adminSecretCode: string | null = null;

export function getAdminSecretCode() {
  if (_adminSecretCode) return _adminSecretCode;

  const adminSecretCode = readRequiredEnv('ADMIN_SECRET_CODE');

  if (adminSecretCode.length < 12) {
    throw new Error('ADMIN_SECRET_CODE must be at least 12 characters long');
  }

  _adminSecretCode = adminSecretCode;
  return _adminSecretCode;
}

export function getSeedAdminEmail() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    throw new Error('Missing required environment variable: ADMIN_EMAIL');
  }
  return email;
}
