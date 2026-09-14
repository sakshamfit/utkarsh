'use strict';
const { createHash } = require('node:crypto');
const { validate } = require('../validation.js');

const RECIPIENT = 'um426207@gmail.com';
const SITE = 'https://utkarsh-viralbuzz.vercel.app';
const deliveryCache = new Map();
const requestCounts = new Map();
const WINDOW = 15 * 60 * 1000;

function json(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { success: false, message: 'Please submit the enquiry form.' });
  }
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    return json(res, 415, { success: false, message: 'Please use the enquiry form to send your details.' });
  }
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.host !== host || !['http:', 'https:'].includes(url.protocol)) throw new Error('Origin mismatch');
    } catch {
      return json(res, 403, { success: false, message: 'Please submit your enquiry from the portfolio.' });
    }
  }
  let input = req.body;
  try {
    if (Buffer.isBuffer(input)) input = input.toString('utf8');
    if (typeof input === 'string') {
      if (Buffer.byteLength(input) > 16384) throw new Error('Too large');
      input = JSON.parse(input);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input)) > 16384) throw new Error('Invalid request');
  } catch {
    return json(res, 400, { success: false, message: 'Please check your details and try again.' });
  }
  if (input.website) return json(res, 400, { success: false, message: 'Unable to submit this enquiry.' });
  const { data, errors, valid } = validate(input);
  if (!valid) return json(res, 422, { success: false, errors, message: 'Please check the highlighted details.' });
  if (typeof input.requestId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(input.requestId)) {
    return json(res, 400, { success: false, message: 'Please reopen the form and try again.' });
  }

  // Enable only after the owner approves FormSubmit and confirms their inbox.
  if (process.env.ENQUIRY_DELIVERY_ENABLED !== 'true') {
    return json(res, 503, { success: false, code: 'EMAIL_SETUP_REQUIRED', message: 'Online enquiries are being connected. Please email me directly for now. Your details have not been sent.' });
  }

  const now = Date.now();
  for (const [key, value] of deliveryCache) if (value.expires <= now) deliveryCache.delete(key);
  for (const [key, value] of requestCounts) if (value.expires <= now) requestCounts.delete(key);
  const digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const duplicate = deliveryCache.get(input.requestId);
  if (duplicate) {
    if (duplicate.digest !== digest) return json(res, 409, { success: false, message: 'Please reopen the form and try again.' });
    const result = await duplicate.promise;
    return json(res, result.status, result.body);
  }
  // Best-effort instance-local throttle. No visitor details are logged or persisted.
  const address = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
  const ipHash = createHash('sha256').update(address).digest('hex');
  const count = requestCounts.get(ipHash) || { attempts: 0, expires: now + WINDOW };
  if (count.attempts >= 5) {
    res.setHeader('Retry-After', String(Math.ceil((count.expires - now) / 1000)));
    return json(res, 429, { success: false, message: 'Please wait a few minutes before trying again, or email me directly.' });
  }
  count.attempts += 1;
  requestCounts.set(ipHash, count);
  const promise = sendEnquiry(data);
  deliveryCache.set(input.requestId, { digest, promise, expires: now + WINDOW });
  // Bound process memory on a public endpoint.
  if (deliveryCache.size > 1000) deliveryCache.delete(deliveryCache.keys().next().value);
  if (requestCounts.size > 2000) requestCounts.delete(requestCounts.keys().next().value);
  const result = await promise;
  if (result.status !== 200) deliveryCache.delete(input.requestId);
  return json(res, result.status, result.body);
};

async function sendEnquiry(data) {
  try {
    const response = await fetch('https://formsubmit.co/ajax/' + RECIPIENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Referer': SITE + '/' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message || 'No project details provided.',
        _subject: 'Viral Buzz Media — new project enquiry',
        _template: 'table',
        _captcha: 'false',
        _url: SITE + '/',
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    // Activation is an owner setup step, never a successful visitor enquiry.
    const needsActivation = /activat|confirm.{0,25}(?:email|address)|verif(?:y|ication)/i.test(String(result.message || ''));
    if (needsActivation) {
      return { status: 503, body: { success: false, code: 'EMAIL_ACTIVATION_REQUIRED', message: 'Online enquiries are being connected. Please email me directly for now.' } };
    }
    if (!response.ok || ![true, 'true'].includes(result.success)) throw new Error('Delivery not accepted');
    return { status: 200, body: { success: true } };
  } catch {
    return { status: 502, body: { success: false, message: 'Your enquiry could not be sent just now. Please try again or email me directly.' } };
  }
}
