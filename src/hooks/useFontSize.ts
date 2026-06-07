const LS_KEY = 'font-size-pref';
type FontSize = 'sm' | 'md' | 'lg';

function applyFontSize(size: FontSize) {
  document.documentElement.setAttribute('data-fontsize', size);
}

export function useFontSize() {
  const current = (document.documentElement.getAttribute('data-fontsize') ?? 'md') as FontSize;

  const setFontSize = (size: FontSize) => {
    localStorage.setItem(LS_KEY, size);
    applyFontSize(size);
    // Force re-render by dispatching a storage event
    window.dispatchEvent(new Event('fontsize-change'));
  };

  return { current, setFontSize };
}

// Call once on app load
export function initFontSize() {
  const saved = (localStorage.getItem(LS_KEY) ?? 'md') as FontSize;
  applyFontSize(saved);
}
