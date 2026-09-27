(() => {
  'use strict';

  document.querySelectorAll('link[data-deferred-stylesheet]').forEach((stylesheet) => {
    stylesheet.addEventListener('load', () => {
      stylesheet.media = 'all';
    }, { once: true });
  });
})();
