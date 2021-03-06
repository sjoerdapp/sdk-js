// @flow
import sodium from 'libsodium-wrappers';
import { random } from './random';
import { generichash } from './hash';
import { concatArrays } from './utils';
import { toUint64le } from './number';
import type { Key } from './aliases';

export const XCHACHA_IV_SIZE = 24;

const SIGNATURE_SEEDBYTES = 32;
export const SYMMETRIC_KEY_SIZE = 32;
export const SIGNATURE_PUBLIC_KEY_SIZE = 32;
export const SIGNATURE_PRIVATE_KEY_SIZE = 64;
export const ENCRYPTION_PUBLIC_KEY_SIZE = 32;
export const ENCRYPTION_PRIVATE_KEY_SIZE = 32;
export const SIGNATURE_SIZE = 64;
export const MAC_SIZE = 16;
export const SYMMETRIC_ENCRYPTION_OVERHEAD = XCHACHA_IV_SIZE + MAC_SIZE;
export const HASH_SIZE = 32;
export const SEAL_OVERHEAD = MAC_SIZE + ENCRYPTION_PUBLIC_KEY_SIZE;

export const SEALED_ENCRYPTION_PRIVATE_KEY_SIZE = 80;
export const SEALED_SIGNATURE_PRIVATE_KEY_SIZE = 112;

export type SodiumKeyPair = {
  privateKey: Key,
  publicKey: Key,
}

export function makeSignKeyPair(): SodiumKeyPair {
  const out = sodium.crypto_sign_keypair();
  delete out.keyType;
  return out;
}

export function makeEncryptionKeyPair(): SodiumKeyPair {
  const out = sodium.crypto_box_keypair();
  delete out.keyType;
  return out;
}

export function getEncryptionKeyPairFromPrivateKey(privKey: Uint8Array): SodiumKeyPair {
  return { privateKey: privKey, publicKey: sodium.crypto_scalarmult_base(privKey) };
}

export function getSignatureKeyPairFromPrivateKey(privateKey: Uint8Array): SodiumKeyPair {
  const publicKey = privateKey.subarray(SIGNATURE_SEEDBYTES);
  return { privateKey, publicKey };
}

export function asymEncrypt(msg: Uint8Array, publicKey: Uint8Array, privKey: Uint8Array): Uint8Array {
  const nonce = random(sodium.crypto_box_NONCEBYTES);
  const cipher = sodium.crypto_box_easy(msg, nonce, publicKey, privKey);
  const res = concatArrays(cipher, nonce);
  return res;
}

export function asymDecrypt(cipherText: Uint8Array, publicKey: Uint8Array, privKey: Uint8Array): Uint8Array {
  const nonceStart = cipherText.length - sodium.crypto_box_NONCEBYTES;
  const nonce = cipherText.subarray(nonceStart);
  const cipherSliced = cipherText.subarray(0, nonceStart);
  return sodium.crypto_box_open_easy(cipherSliced, nonce, publicKey, privKey);
}

export function sealEncrypt(clearData: Uint8Array, pubKey: Uint8Array): Uint8Array {
  return sodium.crypto_box_seal(clearData, pubKey);
}

export function sealDecrypt(cipherText: Uint8Array, recipientKeys: SodiumKeyPair): Uint8Array {
  return sodium.crypto_box_seal_open(cipherText, recipientKeys.publicKey, recipientKeys.privateKey);
}

export function sign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return sodium.crypto_sign_detached(data, privateKey);
}

export function verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): bool {
  return sodium.crypto_sign_verify_detached(signature, data, publicKey);
}

export function deriveIV(seed: Uint8Array, index: number): Uint8Array {
  const buffer = concatArrays(seed, toUint64le(index));
  return generichash(buffer, XCHACHA_IV_SIZE);
}
