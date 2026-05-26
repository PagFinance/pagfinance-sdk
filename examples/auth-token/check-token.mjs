// Uso: node check-token.mjs "<TOKEN_JWT>"
import nacl from 'tweetnacl';
import bs58 from 'bs58';
const token = process.argv[2];
if (!token) { console.error('passe o token como argumento'); process.exit(1); }
const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const msg = ['PagCrypto', `iat:${p.iat}`, `pubkey:${p.pubkey}`].join('\n');
const sigBytes = Array.isArray(p.signature) ? Buffer.from(p.signature)
  : Buffer.from(p.sig, 'base64');
let ok = false;
try { ok = nacl.sign.detached.verify(new TextEncoder().encode(msg), sigBytes, bs58.decode(p.pubkey)); } catch (e) { ok = 'erro: '+e.message; }
console.log('blockchain:', p.blockchain);
console.log('iat:', p.iat, '| exp-iat:', p.exp - p.iat, '| expirado?', Math.floor(Date.now()/1000) > p.exp);
console.log('mensagem reconstruída:', JSON.stringify(msg));
console.log('ASSINATURA VÁLIDA sobre mensagem canônica:', ok);
