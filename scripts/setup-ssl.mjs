import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sslDir = resolve(__dirname, '../ssl');
const certPath = resolve(sslDir, 'cert.pem');
const keyPath = resolve(sslDir, 'key.pem');

if (existsSync(certPath) && existsSync(keyPath)) {
  console.log('SSL certificates already exist.');
  process.exit(0);
}

mkdirSync(sslDir, { recursive: true });

console.log('Generating self-signed SSL certificates...');

execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`, {
  stdio: 'inherit',
  cwd: sslDir,
});

console.log('Certificates generated:');
console.log(`  Key:  ${keyPath}`);
console.log(`  Cert: ${certPath}`);
