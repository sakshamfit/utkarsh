(() => {
  'use strict';
  const dialog = document.getElementById('call-dialog');
  const form = document.getElementById('call-form');
  const success = document.getElementById('call-success');
  const formError = document.getElementById('form-error');
  const submit = document.getElementById('send-enquiry');
  const title = document.getElementById('call-title');
  const description = document.getElementById('call-description');
  const country = document.getElementById('call-country');
  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const countries = window.libphonenumber.getCountries().map((code) => ({
    code, name: countryNames.of(code), dialCode: window.libphonenumber.getCountryCallingCode(code),
  })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const DEFAULT_COUNTRY = 'IN';
  country.replaceChildren(...countries.map(({ code, name, dialCode }) => new Option(`+${dialCode} · ${name}`, code, code === DEFAULT_COUNTRY, code === DEFAULT_COUNTRY)));
  country.addEventListener('change', () => {
    form.elements.namedItem('phone').removeAttribute('aria-invalid');
    document.getElementById('phone-error').hidden = true;
  });
  // Fire change once so the default (India) is reflected without waiting for user input.
  country.dispatchEvent(new Event('change'));
  let opener;
  let submitting = false;
  let submitted = false;
  let requestId;
  let previousPayload;
  let pageScroll = 0;

  // randomUUID is unavailable on some browsers and HTTP development previews.
  function createRequestId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }
  const fields = ['name', 'email', 'phone', 'message'];
  function setErrors(errors) {
    fields.forEach((name) => {
      const field = form.elements.namedItem(name);
      const error = document.getElementById(name + '-error');
      error.textContent = errors[name] || '';
      error.hidden = !errors[name];
      if (errors[name]) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
  }
  function openForm(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    opener = event.currentTarget;
    if (submitted) {
      submitted = false;
      success.hidden = true;
      form.hidden = false;
      title.hidden = false;
      description.hidden = false;
      setErrors({});
    }
    if (dialog.open) return;
    pageScroll = window.scrollY;
    document.body.style.setProperty('--dialog-scroll', '-' + pageScroll + 'px');
    document.body.classList.add('dialog-open');
    dialog.showModal();
    dialog.scrollTop = 0;
    // Keep the mobile keyboard closed until the visitor chooses a field.
    dialog.querySelector('[data-close-dialog]').focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-book-call]').forEach((button) => button.addEventListener('click', openForm));
  dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  let backdropDown = false;
  dialog.addEventListener('pointerdown', (event) => { backdropDown = event.target === dialog; });
  dialog.addEventListener('click', (event) => {
    if (backdropDown && event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
    backdropDown = false;
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    document.body.style.removeProperty('--dialog-scroll');
    window.scrollTo({ top: pageScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });
  form.addEventListener('input', (event) => {
    const name = event.target.name;
    if (!fields.includes(name)) return;
    event.target.removeAttribute('aria-invalid');
    document.getElementById(name + '-error').hidden = true;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    formError.hidden = true;
    const input = Object.fromEntries(new FormData(form));
    const { data, errors, valid } = window.EnquiryValidation.validate(input);
    setErrors(errors);
    if (!valid) {
      form.elements.namedItem(Object.keys(errors)[0]).focus();
      return;
    }
    const fingerprint = JSON.stringify(data);
    if (fingerprint !== previousPayload) {
      requestId = createRequestId();
      previousPayload = fingerprint;
    }
    submitting = true;
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...data, website: input.website, requestId }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        if (result.errors) setErrors(result.errors);
        throw new Error(result.message || 'Your enquiry could not be sent. Please try again or email me directly.');
      }
      submitted = true;
      form.reset();
      previousPayload = undefined;
      requestId = undefined;
      form.hidden = true;
      title.hidden = true;
      description.hidden = true;
      success.hidden = false;
      if (dialog.open) success.focus();
    } catch (error) {
      formError.textContent = error.name === 'AbortError'
        ? 'Sending is taking longer than expected. Please email me directly if you need help.'
        : error.message === 'Failed to fetch'
          ? 'Please check your connection and try again. Your details are still here.'
          : error instanceof SyntaxError
            ? 'The enquiry service is temporarily unavailable. Please try again or email me directly.'
            : error.message;
      formError.hidden = false;
    } finally {
      clearTimeout(timeout);
      submitting = false;
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Request a meeting';
      form.removeAttribute('aria-busy');
    }
  });
})();
