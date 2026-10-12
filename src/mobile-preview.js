export function setupMobilePreview({ poster, panel, editor, returnButton }) {
  const compact = panel.querySelector('canvas');
  const mobile = window.matchMedia('(max-width: 760px)');
  let scheduled;

  function sync() {
    if (panel.hidden) return;
    const width = Math.round(parseFloat(panel.style.getPropertyValue('--mini-poster-width')) * Math.min(devicePixelRatio || 1, 3));
    const height = Math.round(width * poster.height / poster.width);
    if (compact.width !== width || compact.height !== height) { compact.width = width; compact.height = height; }
    compact.getContext('2d').drawImage(poster, 0, 0, width, height);
  }

  function update() {
    scheduled = null;
    const viewport = window.visualViewport;
    const visibleHeight = viewport?.height || innerHeight;
    const top = viewport?.offsetTop || 0;
    const bounds = poster.getBoundingClientRect();
    // Half the full preview width, capped for small screens and the on-screen keyboard.
    const width = Math.max(1, Math.min(bounds.width / 2, (visibleHeight * .28 - 24) * poster.width / poster.height));
    panel.classList.toggle('is-short', visibleHeight < 500);
    panel.style.setProperty('--mini-poster-width', `${width}px`);
    panel.style.setProperty('--preview-top', `${top}px`);
    const style = getComputedStyle(panel);
    const compactHeight = width * poster.height / poster.width + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const show = mobile.matches && bounds.bottom - top <= compactHeight && editor.getBoundingClientRect().bottom - top > compactHeight;
    panel.hidden = !show;
    document.documentElement.classList.toggle('has-mobile-preview', show);
    document.documentElement.style.setProperty('--mobile-preview-height', `${compactHeight}px`);
    if (show) sync();
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  viewportEvents(window.visualViewport);
  function viewportEvents(viewport) {
    viewport?.addEventListener('resize', schedule, { passive: true });
    viewport?.addEventListener('scroll', schedule, { passive: true });
  }
  mobile.addEventListener('change', schedule);
  const observer = new ResizeObserver(schedule);
  observer.observe(poster);
  observer.observe(editor);
  returnButton.addEventListener('click', () => {
    // Hide first so scroll-padding from the compact preview doesn't shift the target.
    panel.hidden = true;
    document.documentElement.classList.remove('has-mobile-preview');
    poster.closest('.preview-section').scrollIntoView({ block: 'start', behavior: 'instant' });
    schedule();
  });
  schedule();
  return { sync };
}
