import { generate } from 'otplib';

const secret = process.argv[2] || 'KJD2GEJTP272SRKM5BOHCEYXBGNXZXIC';
const code = await generate({ secret });
console.log(code);
