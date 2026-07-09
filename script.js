/* ============================================================
   ANNETTE § HAMBURG — Vanilla JS
   1. Mobiles Nav-Menü (Hamburger)
   2. Kontaktformular: Client-Validierung + Submit-Verhalten
   3. Scroll-Reveal (sanftes Einblenden beim Scrollen)
   4. Header-Schatten beim Scrollen
   5. Lese-Fortschrittsbalken + Zurück-nach-oben-Button
   6. Scroll-Spy (aktiver Nav-Punkt)
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     1. Mobiles Nav-Menü
     -------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });

    // Menü schließen, sobald ein Link angeklickt wurde
    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Menü öffnen');
      }
    });
  }

  /* --------------------------------------------------------
     3. Scroll-Reveal
     Blendet ausgewählte Blöcke sanft ein, sobald sie in den
     sichtbaren Bereich scrollen. Respektiert reduzierte
     Bewegung (dann wird sofort alles angezeigt).
     -------------------------------------------------------- */
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var revealSelector = [
    '.hero__title', '.hero__tagline', '.hero__sub', '.hero__lead', '.hero__sub2',
    '.badge', '.sec-title', '.about__text', '.about__media',
    '.bubble', '.riskbox', '.card', '.infobox', '.pricing__price', '.notice',
    '.contact__text', '.form', '.acc', '.seminar__forwhom', '.quickfacts__inner'
  ].join(',');

  var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSelector));
  revealEls.forEach(function (el) { el.classList.add('reveal'); });

  // leichte Staffelung innerhalb von Gruppen (Badges, Blasen, Karten …)
  ['.badges', '.bubbles', '.seminar__cards', '.infoboxes', '.privacy__acc'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (group) {
      Array.prototype.slice.call(group.children).forEach(function (child, i) {
        var t = child.classList.contains('reveal') ? child : child.querySelector('.reveal');
        if (t) { t.style.transitionDelay = Math.min(i * 80, 320) + 'ms'; }
      });
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------
     4. Header-Schatten beim Scrollen
     -------------------------------------------------------- */
  var header = document.querySelector('.site-header');

  /* --------------------------------------------------------
     5. Fortschrittsbalken, Header-Schatten & Zurück-nach-oben
        (gemeinsam in einem Scroll-Handler, performant)
     -------------------------------------------------------- */
  var progressBar = document.getElementById('progressBar');
  var toTop = document.getElementById('toTop');
  var ticking = false;

  function updateUi() {
    ticking = false;
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', scrollTop > 8);
    if (progressBar) {
      // exakter Anteil des bereits gescrollten Bereichs (0–100 %), frame-genau
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
      if (pct < 0) pct = 0; else if (pct > 100) pct = 100;
      progressBar.style.width = pct.toFixed(2) + '%';
    }
    if (toTop) toTop.classList.toggle('is-visible', scrollTop > 500);
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateUi); }
  }
  updateUi();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', updateUi);

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* --------------------------------------------------------
     6. Scroll-Spy: aktiven Nav-Punkt hervorheben
     -------------------------------------------------------- */
  var navLinks = {};
  document.querySelectorAll('.nav__link').forEach(function (a) {
    var id = (a.getAttribute('href') || '').replace('#', '');
    if (id) { navLinks[id] = a; }
  });
  function activateNav(id) {
    if (id === 'datenschutz') { id = 'impressum'; } // gehört zum selben Nav-Punkt
    Object.keys(navLinks).forEach(function (k) {
      navLinks[k].classList.toggle('is-active', k === id);
    });
  }
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { activateNav(entry.target.id); }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    ['ueber-mich', 'kompaktseminar', 'honorar-ablauf', 'kontakt', 'impressum', 'datenschutz']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { spy.observe(el); }
      });
  }

  /* --------------------------------------------------------
     2. Kontaktformular
     Client-Validierung + Versand per fetch an Web3Forms.
     Ohne JS greift der normale POST-Fallback des <form>.
     -------------------------------------------------------- */
  var form = document.querySelector('.form');

  if (form) {
    var status = form.querySelector('.form__status');

    function setError(input, hasError) {
      var field = input.closest('.form__field');
      if (field) {
        field.classList.toggle('has-error', hasError);
      }
      input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    }

    function validateInput(input) {
      var value = input.value.trim();
      var valid = true;

      if (input.hasAttribute('required') && value === '') {
        valid = false;
      }
      if (valid && input.type === 'email' && value !== '') {
        // einfache, robuste E-Mail-Prüfung
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      setError(input, !valid);
      return valid;
    }

    // Live-Validierung beim Verlassen eines Feldes
    form.querySelectorAll('.form__input').forEach(function (input) {
      input.addEventListener('blur', function () {
        validateInput(input);
      });
    });

    var submitBtn = form.querySelector('.form__submit');
    var submitLabel = submitBtn ? submitBtn.textContent : '';

    function showStatus(msg, ok) {
      status.textContent = msg;
      status.classList.add('is-visible');
      status.classList.toggle('is-error', ok === false);
      status.classList.toggle('is-ok', ok === true);
    }

    form.addEventListener('submit', function (e) {
      var allValid = true;
      form.querySelectorAll('.form__input').forEach(function (input) {
        if (!validateInput(input)) { allValid = false; }
      });

      if (!allValid) {
        e.preventDefault();
        showStatus('Bitte prüfen Sie die markierten Felder.', false);
        var firstError = form.querySelector('.has-error .form__input');
        if (firstError) { firstError.focus(); }
        return;
      }

      // fetch wird unterstützt -> ohne Neuladen senden (sonst normaler POST-Fallback)
      if (!window.fetch || !window.FormData) { return; }

      e.preventDefault();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }
      showStatus('Ihre Nachricht wird gesendet …', null);

      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (data) {
          // Web3Forms antwortet mit { success: true/false, message: "…" }
          var ok = data && (data.success === true || data.ok === true);
          if (ok) {
            form.reset();
            showStatus('Vielen Dank! Ihre Nachricht wurde gesendet – in der Regel erhalten Sie innerhalb von zwei Werktagen eine Rückmeldung.', true);
          } else {
            showStatus((data && data.message) || 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.', false);
          }
        })
        .catch(function () {
          showStatus('Verbindung fehlgeschlagen. Bitte erreichen Sie mich per E-Mail oder Telefon.', false);
        })
        .then(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
        });
    });
  }
})();
