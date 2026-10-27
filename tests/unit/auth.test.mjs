// Login tokens: valid tokens pass, anything malformed is rejected without throwing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../../server/src/auth.js';

const SECRET = 'k'.repeat(32);
const good = signToken(SECRET, { uid: 7, u: 'test' });
const [body, sig] = good.split('.');

test('a signed token is accepted', () => assert.equal(verifyToken(SECRET, good).uid, 7));

test('malformed tokens are rejected, never thrown', () => {
  for (const t of [
    body + '.' + 'é'.repeat(sig.length), // same string length, more bytes
    body + '.', '.', 'x', '', null, undefined, 5, {}, body + '.' + sig + 'x', body + '.' + sig.slice(1),
    signToken('other-secret'.repeat(3), { uid: 7 }),
  ]) assert.equal(verifyToken(SECRET, t), null, String(t));
});

test('an expired token is rejected', () => assert.equal(verifyToken(SECRET, signToken(SECRET, { uid: 7 }, -1)), null));
