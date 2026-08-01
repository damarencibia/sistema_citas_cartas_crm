import { onBeforeUnmount } from 'vue';

export function useReveal() {
  let observer: IntersectionObserver | null = null;

  function observeReveal() {
    observer?.disconnect();
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('reveal-visible'));
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => observer!.observe(el));
  }

  onBeforeUnmount(() => observer?.disconnect());

  return { observeReveal };
}
