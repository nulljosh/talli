// Landing: reveal on scroll.
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', function () {
  var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });

  // The app behind the hero runs on its own: amounts count up, the cheque lands, messages arrive.
  var demo = document.querySelector('.hero-demo'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (demo) {
    var fmt = function (n, cents) { return n.toLocaleString('en-CA', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); };
    var cycle = function () {
      demo.querySelectorAll('[data-count]').forEach(function (el) {
        var to = parseFloat(el.dataset.count), cents = el.dataset.count.indexOf('.') > 0, t0 = performance.now();
        if (still) { el.textContent = fmt(to, cents); return; }
        (function step(t) { var k = Math.min(1, (t - t0) / 1400); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)), cents); if (k < 1) requestAnimationFrame(step); })(t0);
      });
      var m = demo.querySelector('[data-meter]'); m.style.width = '0'; setTimeout(function () { m.style.width = '18%'; }, 60);
      var paid = demo.querySelector('[data-paid]'), when = demo.querySelector('[data-when]');
      paid.classList.remove('on'); paid.textContent = 'It landed'; when.textContent = 'Wednesday, in 2 days';
      setTimeout(function () { paid.classList.add('on'); paid.textContent = 'Landed. Undo'; when.textContent = 'Paid. Next one in 30 days'; }, still ? 0 : 3200);
      demo.querySelectorAll('.msg').forEach(function (el, i) { el.classList.remove('in'); setTimeout(function () { el.classList.add('in'); }, still ? 0 : 500 + i * 700); });
    };
    cycle(); if (!still) setInterval(function () { if (!document.hidden) cycle(); }, 9000);
    // Parallax: the app drifts at 0.45, the copy lifts at 0.2 and fades.
    var copy = document.querySelector('.hero-copy'), tk = 0;
    if (!still) addEventListener('scroll', function () { if (tk) return; tk = requestAnimationFrame(function () { tk = 0;
      var y = scrollY, h = innerHeight; if (y > h * 1.2) return;
      demo.style.setProperty('--py', (y * .45) + 'px'); copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .7));
    }); }, { passive: true });
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
});
