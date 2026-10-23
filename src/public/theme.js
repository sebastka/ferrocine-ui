// Applies the stored theme choice before the first paint (an external script: the Content
// Security Policy allows no inline one). Same rules as src/logic/theme.ts: "light" or "dark"
// set data-theme on <html>; anything else follows the system.
(function () {
  try {
    var t = localStorage.getItem('ferrocine.theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch {
    // Storage unavailable: follow the system.
  }
})();
