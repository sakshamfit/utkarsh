'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { validate } = require('../validation.js');
const valid = { name: 'Élodie Martin', email: 'elodie@example.com', phone: '+33 (0)6 12 34 56 78', message: 'A product website.' };
function newHandler() {
  delete require.cache[require.resolve('../api/book-call.js')];
  return require('../api/book-call.js');
}
function call(handler, body, options = {}) {
  return new Promise((resolve, reject) => {
    const req = { method: options.method || 'POST', headers: { host: 'portfolio.example', origin: 'https://portfolio.example', 'content-type': 'application/json', ...options.headers }, socket: { remoteAddress: '192.0.2.1' }, body };
    const headers = {};
    const res = { setHeader(key, value) { headers[key] = value; }, end(value) { resolve({ status: this.statusCode, body: JSON.parse(value), headers }); } };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}
test('accepts international details and rejects malformed email and phone numbers', () => {
  for (const phone of ['+33 (0)6 12 34 56 78', '+91 98765 43210', '+1 202-555-0147', '0612345678']) assert.equal(validate({ ...valid, phone, message: '' }).valid, true);
  assert.equal(validate({ ...valid, name: '李' }).valid, true);
  for (const email of ['not-an-email', 'name@', 'a@b..com', 'a b@example.com', 'a@example.com\nBCC:test@example.com']) assert.ok(validate({ ...valid, email }).errors.email);
  for (const phone of ['123', 'call me tomorrow', '++33612345678', '1234567890123456']) assert.ok(validate({ ...valid, phone }).errors.phone);
});
test('server rejects invalid, cross-origin, oversized, and bot submissions without sending', async (t) => {
  let requests = 0;
  t.mock.method(global, 'fetch', async () => { requests++; throw new Error('Unexpected send'); });
  const handler = newHandler();
  const good = { ...valid, requestId: randomUUID() };
  assert.equal((await call(handler, { ...good, email: 'invalid' })).status, 422);
  assert.equal((await call(handler, good, { method: 'GET' })).status, 405);
  assert.equal((await call(handler, good, { headers: { origin: 'https://other.example' } })).status, 403);
  assert.equal((await call(handler, { ...good, website: 'spam' })).status, 400);
  assert.equal((await call(handler, JSON.stringify({ ...good, message: 'x'.repeat(17000) }))).status, 400);
  assert.equal(requests, 0);
});
test('country selection formats national numbers and avoids duplicated calling codes', () => {
  const cases = [
    ['FR', '06 12 34 56 78', '+33612345678'],
    ['FR', '+33 6 12 34 56 78', '+33612345678'],
    ['IN', '98765 43210', '+919876543210'],
    ['US', '(202) 555-0147', '+12025550147'],
    ['IT', '02 36618 300', '+390236618300'],
  ];
  for (const [country, phone, expected] of cases) {
    const result = validate({ ...valid, country, phone });
    assert.equal(result.valid, true);
    assert.equal(result.data.phone, expected);
  }
  for (const [country, phone] of [['FR', '123'], ['XX', '0612345678'], ['FR', '+91 98765 43210'], ['IN', '987654321098765']]) {
    assert.ok(validate({ ...valid, country, phone }).errors.phone);
  }
});
test('disabled delivery returns a setup response and makes no provider request', async (t) => {
  delete process.env.ENQUIRY_DELIVERY_ENABLED;
  t.mock.method(global, 'fetch', async () => { throw new Error('Must never contact provider'); });
  const result = await call(newHandler(), { ...valid, requestId: randomUUID() });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'EMAIL_SETUP_REQUIRED');
  assert.equal(result.body.success, false);
});
test('accepted delivery sends all fields to the fixed recipient and deduplicates a retry', async (t) => {
  process.env.ENQUIRY_DELIVERY_ENABLED = 'true';
  t.after(() => delete process.env.ENQUIRY_DELIVERY_ENABLED);
  let requests = 0;
  t.mock.method(global, 'fetch', async (url, options) => {
    requests++;
    assert.equal(url, 'https://formsubmit.co/ajax/gireeshuiux@gmail.com');
    const payload = JSON.parse(options.body);
    for (const key of ['name', 'email', 'phone', 'message']) assert.equal(payload[key], valid[key]);
    assert.equal(payload.to, undefined);
    return { ok: true, json: async () => ({ success: 'true', message: 'Success! Form submitted successfully.' }) };
  });
  const handler = newHandler();
  const body = { ...valid, requestId: randomUUID(), to: 'attacker@example.com' };
  const results = await Promise.all([call(handler, body), call(handler, body)]);
  assert.equal(results[0].status, 200);
  assert.equal(results[1].body.success, true);
  assert.equal(requests, 1);
});
test('activation, negative acknowledgements, and network failures never show success', async (t) => {
  process.env.ENQUIRY_DELIVERY_ENABLED = 'true';
  t.after(() => delete process.env.ENQUIRY_DELIVERY_ENABLED);
  let response;
  t.mock.method(global, 'fetch', async () => {
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  });
  const handler = newHandler();
  response = { success: 'true', message: 'Please activate your form using the link in your email.' };
  let result = await call(handler, { ...valid, requestId: randomUUID() });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'EMAIL_ACTIVATION_REQUIRED');
  response = { success: 'false', message: 'Unable to submit.' };
  result = await call(handler, { ...valid, requestId: randomUUID() });
  assert.equal(result.status, 502);
  assert.equal(result.body.success, false);
  response = new Error('Network unavailable');
  assert.equal((await call(handler, { ...valid, requestId: randomUUID() })).body.success, false);
});
