export function track(eventName, parameters = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, parameters);
}

window.ioyTrack = track;

document.addEventListener('click', event => {
  const target = event.target.closest('[data-analytics-event]');
  if (!target) return;
  track(target.dataset.analyticsEvent, {
    placement: target.dataset.analyticsPlacement || 'unknown',
  });
});

document.querySelectorAll('.faq-list details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    track('faq_open', { question: item.querySelector('summary')?.textContent?.trim() || 'unknown' });
  });
});
