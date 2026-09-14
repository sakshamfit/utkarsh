(() => {
  'use strict';
  const config = window.SITE_CONFIG || {};
  const safeEmail = (value) => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value : '';
  const safeUrl = (value, domains) => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && domains.some((domain) => url.hostname === domain || url.hostname.endsWith('.' + domain)) ? url : null; } catch { return null; }
  };
  document.getElementById('year').textContent = new Date().getFullYear();
  const primaryEmail = safeEmail(config.primaryEmail) || 'gireeshuiux@gmail.com';
  const personalEmail = safeEmail(config.personalEmail);
  const businessEmail = safeEmail(config.businessEmail);
  for (const [type, email] of Object.entries({ primary: primaryEmail, personal: personalEmail, business: businessEmail })) {
    const link = document.querySelector(`[data-email-link="${type}"]`);
    const text = document.querySelector(`[data-email-text="${type}"]`);
    if (!email) continue;
    link.href = 'mailto:' + email;
    text.textContent = email;
    link.hidden = type === 'primary' && (primaryEmail === personalEmail || primaryEmail === businessEmail);
  }
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
    });
  }
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-nav');
  const setMenu = (open) => { menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); };
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); } });
  document.addEventListener('click', (event) => { if (!menu.hidden && !event.target.closest('.header')) setMenu(false); });
  matchMedia('(min-width: 721px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });
})();
