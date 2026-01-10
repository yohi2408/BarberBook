import crypto from 'crypto';

// Generate VAPID Keys
const curve = crypto.createECDH('prime256v1');
curve.generateKeys();

const publicKey = curve.getPublicKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const privateKey = curve.getPrivateKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

console.log('\n🔑 VAPID Keys Generated:\n');
console.log('Public Key (for frontend):', publicKey);
console.log('\nPrivate Key (for Cloudflare Worker):', privateKey);
console.log('\n⚠️  IMPORTANT: Keep the private key secret!\n');
