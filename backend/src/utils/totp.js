import { generateSecret as otplibGenSecret, generateURI, verify as otplibVerify } from 'otplib';
import QRCode from 'qrcode';

export function generateSecret() {
  return otplibGenSecret();
}

export function buildOtpAuthUrl(email, secret) {
  return generateURI({ issuer: 'Nexnetra', label: email, secret });
}

export async function generateQrCodeDataUrl(otpAuthUrl) {
  return QRCode.toDataURL(otpAuthUrl);
}

export function verifyToken(token, secret) {
  try {
    return otplibVerify({ token, secret });
  } catch (err) {
    return false;
  }
}
