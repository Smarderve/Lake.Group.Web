(function () {
  'use strict';
  function init() {
    var page = document.body && document.body.getAttribute('data-phase-01-under-construction') === 'true';
    if (!page) return;

    // Construction pages intentionally end after the experience; remove any legacy footer mount.
    document.querySelectorAll('.site-footer').forEach(function (footer) { footer.remove(); });

    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { /* ignore */ }
    var canvases = document.querySelectorAll('canvas[data-animation-src]');
    if (!canvases.length) return;
    import('./vendor/dotlottie-web/index.js').then(function (module) {
      var DotLottie = module.DotLottie;
      DotLottie.setWasmUrl('/assets/vendor/dotlottie-web/dotlottie-player.wasm');
      canvases.forEach(function (canvas) {
        var failed = false;
        var fallback = function () {
          if (failed) return;
          failed = true;
          canvas.hidden = true;
          var notice = document.createElement('span');
          notice.className = 'phase-01-under-construction__fallback';
          notice.textContent = 'This experience is being prepared.';
          canvas.parentElement.appendChild(notice);
        };
        try {
          var player = new DotLottie({
            canvas: canvas,
            src: canvas.getAttribute('data-animation-src'),
            animationId: canvas.getAttribute('data-animation-id') || undefined,
            autoplay: !reduce,
            loop: true,
            backgroundColor: 'transparent',
            layout: { fit: 'contain', align: [0.5, 0.5] },
            renderConfig: { autoResize: true, freezeOnOffscreen: true }
          });
          player.addEventListener('load', function () { canvas.dataset.animationReady = '1'; });
          player.addEventListener('loadError', fallback);
          player.addEventListener('renderError', fallback);
          window.setTimeout(function () {
            if (canvas.dataset.animationReady !== '1') fallback();
          }, 5000);
          canvas._lakeDotLottie = player;
        } catch (_) { fallback(); }
      });
    }).catch(function () {
      canvases.forEach(function (canvas) {
        canvas.hidden = true;
        var notice = document.createElement('span');
        notice.className = 'phase-01-under-construction__fallback';
        notice.textContent = 'This experience is being prepared.';
        canvas.parentElement.appendChild(notice);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
