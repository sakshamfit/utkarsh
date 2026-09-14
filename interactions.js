(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.hero-image');
  const header = document.querySelector('.header');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motionAllowed = () => !reducedMotion.matches;
  const introDuration = 3200;
  let introPlayed = false;
  let introTimer;
  let introStartTimer;
  let introFrame;
  let introCycle = 0;

  const resetIntro = () => {
    introCycle += 1;
    clearTimeout(introTimer);
    clearTimeout(introStartTimer);
    cancelAnimationFrame(introFrame);
    hero.classList.remove('intro-active');
    root.classList.remove('intro-active');
    introPlayed = false;
  };

  // Wait for a visible, decoded portrait before the single, unhurried exposure.
  // A new visit or tab return gets a fresh reveal, including back/forward cache restores.
  const playIntro = async () => {
    if (introPlayed || document.hidden || !motionAllowed() || !portrait.complete || !portrait.naturalWidth) return;
    introPlayed = true;
    const cycle = introCycle;
    try { await portrait.decode(); } catch { /* A loaded portrait can still be displayed. */ }
    if (cycle !== introCycle || document.hidden || !motionAllowed()) return;
    introFrame = requestAnimationFrame(() => {
      introFrame = requestAnimationFrame(() => {
        introStartTimer = setTimeout(() => {
          if (cycle !== introCycle || document.hidden || !motionAllowed()) return;
          hero.classList.add('intro-active');
          root.classList.add('intro-active');
          introTimer = setTimeout(() => {
            hero.classList.remove('intro-active');
            root.classList.remove('intro-active');
          }, introDuration + 150);
        }, 220);
      });
    });
  };
  portrait.addEventListener('load', playIntro);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resetIntro();
    playIntro();
  });
  window.addEventListener('pagehide', resetIntro);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetIntro();
    else playIntro();
  });
  if (portrait.complete) playIntro();

  // Reveal once, progressively. Without an observer, everything remains visible.
  let revealObserver;
  const revealElements = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && motionAllowed()) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    revealElements.forEach((element) => {
      if (element.getBoundingClientRect().top < innerHeight) return;
      element.classList.add('reveal-pending');
      revealObserver.observe(element);
    });
  }
  document.addEventListener('focusin', (event) => {
    const container = event.target.closest('[data-reveal]');
    if (container) container.classList.add('is-visible');
  });

  const controls = [...document.querySelectorAll('.button, .round-link')];
  controls.forEach((control) => {
    // Keep real link semantics and immediate navigation underneath the feedback.
    control.classList.add('reactive-control');
    control.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || !motionAllowed() || event.pointerType === 'touch') return;
      const bounds = control.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      control.style.setProperty('--pointer-x', x + 'px');
      control.style.setProperty('--pointer-y', y + 'px');
      control.style.setProperty('--magnet-x', Math.max(-5, Math.min(5, (x - bounds.width / 2) * .045)) + 'px');
      control.style.setProperty('--magnet-y', Math.max(-4, Math.min(4, (y - bounds.height / 2) * .10)) + 'px');
    });
    const reset = () => {
      control.style.setProperty('--magnet-x', '0px');
      control.style.setProperty('--magnet-y', '0px');
    };
    control.addEventListener('pointerleave', reset);
    control.addEventListener('blur', reset);
    control.addEventListener('click', (event) => {
      if (!motionAllowed()) return;
      const bounds = control.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'click-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      const diameter = Math.max(bounds.width, bounds.height) * 2;
      const x = event.detail ? event.clientX - bounds.left : bounds.width / 2;
      const y = event.detail ? event.clientY - bounds.top : bounds.height / 2;
      Object.assign(ripple.style, { width: diameter + 'px', height: diameter + 'px', left: (x - diameter / 2) + 'px', top: (y - diameter / 2) + 'px' });
      control.append(ripple);
      setTimeout(() => ripple.remove(), 680);
    });
  });

  // A small pointer-led change in perspective, with no fake dragging or scroll capture.
  const tiltSurfaces = [...document.querySelectorAll('[data-tilt]')];
  tiltSurfaces.forEach((surface) => {
    let frame = 0;
    let point = null;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      surface.style.setProperty('--tilt-x', '0deg');
      surface.style.setProperty('--tilt-y', '0deg');
      surface.classList.remove('is-pointed');
    };
    surface.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || !motionAllowed() || event.pointerType === 'touch') return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const bounds = surface.getBoundingClientRect();
        const x = (point.x - bounds.left) / bounds.width;
        const y = (point.y - bounds.top) / bounds.height;
        surface.style.setProperty('--tilt-x', ((.5 - y) * 3.2) + 'deg');
        surface.style.setProperty('--tilt-y', ((x - .5) * 3.2) + 'deg');
        surface.style.setProperty('--glow-x', (x * 100) + '%');
        surface.style.setProperty('--glow-y', (y * 100) + '%');
        surface.classList.add('is-pointed');
      });
    });
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
  });

  // Animate native details, retaining their keyboard support and no-JS fallback.
  const accordionStates = [];
  document.querySelectorAll('.service-list details').forEach((details) => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('.service-detail');
    const state = { details, animation: null, desiredOpen: details.open };
    accordionStates.push(state);
    summary.addEventListener('click', (event) => {
      if (!motionAllowed() || typeof details.animate !== 'function') return;
      event.preventDefault();
      const startHeight = details.getBoundingClientRect().height;
      state.desiredOpen = state.animation ? !state.desiredOpen : !details.open;
      if (state.animation) {
        const prior = state.animation;
        state.animation = null;
        prior.onfinish = null;
        prior.cancel();
      }
      details.style.height = startHeight + 'px';
      details.style.overflow = 'hidden';
      details.open = true;
      details.classList.toggle('is-closing', !state.desiredOpen);
      const border = 1;
      const endHeight = state.desiredOpen ? summary.getBoundingClientRect().height + content.getBoundingClientRect().height + border : summary.getBoundingClientRect().height + border;
      state.animation = details.animate([{ height: startHeight + 'px' }, { height: endHeight + 'px' }], { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' });
      state.animation.onfinish = () => {
        details.open = state.desiredOpen;
        details.style.height = '';
        details.style.overflow = '';
        details.classList.remove('is-closing');
        state.animation = null;
      };
    });
  });

  // Native anchor scrolling, plus selection feedback and accessible focus at the destination.
  const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-nav a')];
  const sections = ['home', 'contact', 'services'].map((id) => document.getElementById(id)).filter(Boolean);
  let scrollFrame = 0;
  let focusTimer;
  let focusTarget = null;
  let highlightTimer;
  const cancelPendingFocus = () => { clearTimeout(focusTimer); focusTarget = null; };
  document.addEventListener('wheel', cancelPendingFocus, { passive: true });
  document.addEventListener('touchstart', cancelPendingFocus, { passive: true });
  document.addEventListener('keydown', cancelPendingFocus);
  document.addEventListener('pointerdown', cancelPendingFocus);
  const finishAnchorFocus = () => {
    if (!focusTarget) return;
    const target = focusTarget;
    cancelPendingFocus();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  document.addEventListener('scrollend', finishAnchorFocus);
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || link.hasAttribute('data-book-call')) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      target.classList.add('is-visible');
      if (target.id === 'book' && motionAllowed()) {
        clearTimeout(highlightTimer);
        target.classList.add('booking-arrival');
        highlightTimer = setTimeout(() => target.classList.remove('booking-arrival'), 1800);
      }
      focusTarget = target;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(finishAnchorFocus, motionAllowed() ? 1100 : 0);
    });
  });

  const updateScroll = () => {
    scrollFrame = 0;
    const scroll = window.scrollY;
    const range = Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--reading-progress', Math.min(1, scroll / range));
    header.classList.toggle('is-scrolled', scroll > 24);
    let current = 'home';
    const boundary = header.getBoundingClientRect().height + innerHeight * .28;
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= boundary) current = section.id; });
    if (innerHeight + scroll >= root.scrollHeight - 8) current = 'services';
    navLinks.forEach((link) => {
      if (link.getAttribute('href') === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (motionAllowed() && innerWidth > 720 && scroll < hero.offsetHeight + header.offsetHeight) {
      hero.style.setProperty('--portrait-shift', Math.min(28, scroll * .055) + 'px');
    }
  };
  const queueScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
  document.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  updateScroll();

  reducedMotion.addEventListener('change', () => {
    resetIntro();
    if (!reducedMotion.matches) { playIntro(); return; }
    hero.style.removeProperty('--portrait-shift');
    revealObserver?.disconnect();
    revealElements.forEach((element) => element.classList.add('is-visible'));
    controls.forEach((control) => { control.style.removeProperty('--magnet-x'); control.style.removeProperty('--magnet-y'); });
    tiltSurfaces.forEach((surface) => { surface.style.removeProperty('--tilt-x'); surface.style.removeProperty('--tilt-y'); surface.classList.remove('is-pointed'); });
    document.querySelectorAll('.click-ripple').forEach((ripple) => ripple.remove());
    accordionStates.forEach((state) => {
      if (!state.animation) return;
      state.animation.onfinish = null;
      state.animation.cancel();
      state.animation = null;
      state.details.open = state.desiredOpen;
      state.details.style.height = '';
      state.details.style.overflow = '';
      state.details.classList.remove('is-closing');
    });
  });
})();
