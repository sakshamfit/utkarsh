(() => {
  'use strict';
  const config = window.SITE_CONFIG || {};
  const safeEmail = (value) => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value : '';
  const safeUrl = (value, domains) => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && domains.some((domain) => url.hostname === domain || url.hostname.endsWith('.' + domain)) ? url : null; } catch { return null; }
  };
  // Display current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const primaryEmail = safeEmail(config.primaryEmail) || 'um426207@gmail.com';
  const personalEmail = safeEmail(config.personalEmail);
  const businessEmail = safeEmail(config.businessEmail);
  for (const [type, email] of Object.entries({ primary: primaryEmail, personal: personalEmail, business: businessEmail })) {
    const link = document.querySelector(`[data-email-link="${type}"]`);
    const text = document.querySelector(`[data-email-text="${type}"]`);
    if (!link || !text) continue;
    if (!email) { link.hidden = true; continue; }
    link.href = 'mailto:' + email;
    text.textContent = email;
    link.hidden = type === 'primary' && (primaryEmail === personalEmail || primaryEmail === businessEmail);
  }
  // Social links (Instagram, LinkedIn)
  for (const [type, value, domains] of [['linkedin', config.linkedinUrl, ['linkedin.com']], ['instagram', config.instagramUrl, ['instagram.com']]]) {
    const url = safeUrl(value, domains);
    document.querySelectorAll(`[data-social="${type}"]`).forEach((link) => {
      if (!url) return;
      link.hidden = false;
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('aria-disabled');
      link.removeAttribute('title');
      const handleEl = link.querySelector('[data-handle]');
      if (handleEl && type === 'instagram' && config.instagramHandle) handleEl.textContent = config.instagramHandle;
    });
  }
  // WhatsApp / call links
  const waNumber = typeof config.whatsappNumber === 'string' ? config.whatsappNumber.replace(/[^\d]/g, '') : '';
  document.querySelectorAll('[data-whatsapp]').forEach((link) => {
    if (!waNumber) return;
    const message = link.getAttribute('data-whatsapp') || "Hi Utkarsh, I'd like to discuss a project.";
    link.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(message);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.removeAttribute('aria-disabled');
    const display = link.querySelector('[data-whatsapp-display]');
    if (display && config.whatsappDisplay) display.textContent = config.whatsappDisplay;
  });
  document.querySelectorAll('[data-call]').forEach((link) => {
    if (!waNumber) return;
    link.href = 'tel:+' + waNumber;
    const display = link.querySelector('[data-call-display]');
    if (display && config.whatsappDisplay) display.textContent = config.whatsappDisplay;
  });

  // Mobile menu
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-nav');
  if (menuButton && menu) {
    const setMenu = (open) => { menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); };
    menuButton.addEventListener('click', () => setMenu(menu.hidden));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); } });
    document.addEventListener('click', (event) => { if (!menu.hidden && !event.target.closest('.header')) setMenu(false); });
    matchMedia('(min-width: 721px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });
  }
})();
