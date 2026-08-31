/* CHARM / ชาม — fortune ritual controller.
   Screen flow: opening → focus → revealing → shake → result  (+ recoverable error).
   Reduced motion collapses revealing/shake into a direct transition to the result. */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REVEALING_MS = 1800; // "Your fortune is revealing…" dwell
  var SHAKE_ANIM_MS = 1000; // card shake + open before result

  var app = document.getElementById('app');
  var statusEl = document.getElementById('ritual-status');
  var screens = {};
  var current = 'opening';
  var busy = false;
  var fortunes = null;
  var drawn = null;
  var motionEnabled = false; // devicemotion listener attached
  var motionArmed = false; // true only while the shake screen is showing
  var shakeEnergy = 0; // accumulates while the phone is being shaken, then decays
  var SHAKE_TRIGGER = 95; // energy needed to break the bowl open

  /* Haptics — navigator.vibrate is Android/Chrome only; iOS Safari has no web haptic
     API, so this is a progressive enhancement and silently no-ops elsewhere. */
  function haptic(pattern) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        /* ignore */
      }
    }
  }

  /* ---------- footer, shared across every screen ---------- */
  function footerMarkup() {
    var f = document.createElement('div');
    f.className = 'charm-footer';
    f.innerHTML =
      '<p>Made by Pinky Arunwattanamongkol and Fai Chittayasodhara</p>' + '<p>With Tom Yum Lab</p>';
    return f;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (el) {
    screens[el.dataset.screen] = el;
    el.appendChild(footerMarkup());
  });

  /* ---------- viewport height: make every screen fit the device exactly ----------
     CSS var(--app-h) falls back to 100dvh/100vh; this pins it to the real visible
     height and keeps it current as the mobile browser's toolbars slide in and out. */
  var vhRaf = 0;
  function syncAppHeight() {
    vhRaf = 0;
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    if (h) document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
  }
  function queueAppHeight() {
    if (vhRaf) return;
    vhRaf = window.requestAnimationFrame(syncAppHeight);
  }
  syncAppHeight();
  window.addEventListener('resize', queueAppHeight);
  window.addEventListener('orientationchange', function () {
    window.setTimeout(syncAppHeight, 250);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', queueAppHeight);
  }

  /* ---------- navigation ---------- */
  function show(name) {
    if (!screens[name]) return;
    Object.keys(screens).forEach(function (key) {
      var el = screens[key];
      el.classList.remove('is-active');
      if (key !== name) el.hidden = true;
    });
    var next = screens[name];
    next.hidden = false;
    // reflow so the entrance animation restarts every visit
    void next.offsetWidth;
    next.classList.add('is-active');
    current = name;
    motionArmed = name === 'shake';
    shakeEnergy = 0;
    if (app) app.scrollTop = 0;
    window.scrollTo(0, 0);

    next.setAttribute('tabindex', '-1');
    next.focus({ preventScroll: true });
  }

  function announce(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  /* ---------- fortune data ---------- */
  function loadFortunes() {
    if (fortunes) return Promise.resolve(fortunes);
    return fetch('fortune.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = data && data.collection && data.collection.fortunes;
        if (!list || !list.length) throw new Error('empty collection');
        fortunes = list;
        return fortunes;
      });
  }

  function pickFortune() {
    drawn = fortunes[Math.floor(Math.random() * fortunes.length)];
    return drawn;
  }

  function pad2(n) {
    return String(n).length < 2 ? '0' + n : String(n);
  }

  function foodSrc(imagePath) {
    if (!imagePath) return '';
    var name = imagePath.split('/').pop();
    return 'asset/food/' + name;
  }

  function renderResult(f) {
    document.getElementById('slip-number').textContent = pad2(f.id);
    document.getElementById('slip-title').textContent = f.title || '';

    var th = document.getElementById('slip-title-th');
    if (f.thaiTitle) {
      th.textContent = f.thaiTitle;
      th.hidden = false;
    } else {
      th.hidden = true;
    }

    document.getElementById('slip-overall').textContent = f.overall || '';
    document.getElementById('area-love').textContent = f.love || '';
    document.getElementById('area-wealth').textContent = f.wealth || '';
    document.getElementById('area-work').textContent = f.workStudy || '';
    document.getElementById('area-health').textContent = f.health || '';

    var dish = document.getElementById('slip-dish');
    var kicker = document.getElementById('dish-kicker');
    var nameEl = document.getElementById('dish-name');
    var noteEl = document.getElementById('dish-note');
    var thumb = document.getElementById('dish-thumb');
    var img = document.getElementById('dish-img');

    if (f.luckyDish) {
      dish.classList.remove('is-sign');
      kicker.textContent = 'Your lucky dish';
      nameEl.textContent = f.luckyDish;
      nameEl.hidden = false;
      thumb.hidden = false;
      var src = foodSrc(f.image);
      if (src) {
        img.src = src;
        img.alt = f.luckyDish;
        thumb.hidden = false;
      } else {
        thumb.hidden = true;
      }
      if (f.luckyDishNote) {
        noteEl.textContent = f.luckyDishNote;
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
      dish.hidden = false;
    } else if (f.luckySign) {
      dish.classList.add('is-sign');
      kicker.textContent = 'Your lucky sign';
      nameEl.hidden = true;
      thumb.hidden = true;
      noteEl.textContent = f.luckySign;
      noteEl.hidden = false;
      dish.hidden = false;
    } else {
      dish.hidden = true;
    }
  }

  function goToResult() {
    renderResult(drawn);
    show('result');
    haptic(24); // a soft settle as the slip lands
    announce('Your fortune is ready. Number ' + drawn.id + ', ' + drawn.title + '.');
    busy = false;
  }

  function goToError() {
    show('error');
    announce('The bowl needs a moment. Try again.');
    busy = false;
  }

  /* ---------- ritual steps ---------- */
  function beginReveal() {
    if (busy) return;
    busy = true;
    requestMotionPermission(); // must run inside this user gesture (iOS)

    loadFortunes()
      .then(function () {
        pickFortune();
        if (REDUCED) {
          goToResult(); // short, direct transition — keeps meaning, skips choreography
          return;
        }
        show('revealing');
        announce('Your fortune is revealing.');
        window.setTimeout(function () {
          show('shake');
          haptic(12); // subtle cue: the bowl is now in your hands
          announce('Shake your phone or tap the screen to reveal your fortune.');
          busy = false;
        }, REVEALING_MS);
      })
      .catch(function (err) {
        console.error('[charm] could not load fortunes:', err);
        goToError();
      });
  }

  function revealFortune() {
    if (busy || current !== 'shake' || !drawn) return;
    busy = true;
    motionArmed = false;
    shakeEnergy = 0;
    haptic([0, 35, 45, 70]); // the bowl cracks open
    announce('The bowl is shaking.');

    var card = screens.shake.querySelector('.fortune-container');
    if (REDUCED || !card) {
      goToResult();
      return;
    }
    card.classList.remove('is-charging');
    card.classList.add('is-shaking');
    window.setTimeout(function () {
      card.classList.remove('is-shaking');
      card.classList.add('is-opening');
    }, SHAKE_ANIM_MS - 300);
    window.setTimeout(function () {
      card.classList.remove('is-opening');
      goToResult();
    }, SHAKE_ANIM_MS);
  }

  function tryAgain() {
    drawn = null;
    busy = false;
    shakeEnergy = 0;
    var card = screens.shake.querySelector('.fortune-container');
    if (card) card.classList.remove('is-shaking', 'is-opening', 'is-charging');
    show('opening');
    announce('');
  }

  /* ---------- share ---------- */
  function shareFortune() {
    if (!drawn) return;
    var title = 'CHARM — Fortune ' + pad2(drawn.id) + ': ' + drawn.title;
    var text = drawn.title + ' — ' + drawn.overall + '\n\nDrawn at Sala Thai · Food · Luck · Prosperity';
    var url = window.location.href;

    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text + '\n' + url).then(
        function () {
          announce('Fortune copied to clipboard.');
        },
        function () {}
      );
    }
  }

  /* ---------- device shake ---------- */
  function requestMotionPermission() {
    if (motionEnabled) return;
    var DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      DME.requestPermission()
        .then(function (state) {
          if (state === 'granted') enableMotion();
        })
        .catch(function () {});
    } else if (DME) {
      enableMotion();
    }
  }

  function enableMotion() {
    if (motionEnabled) return;
    motionEnabled = true;

    var last = null;
    var lastAt = 0;
    var decayTimer = 0;

    window.addEventListener('devicemotion', function (e) {
      if (!motionArmed || busy) return;
      var a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;

      var now = Date.now();
      if (now - lastAt < 80) return;
      var x = a.x || 0;
      var y = a.y || 0;
      var z = a.z || 0;

      if (last) {
        var delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
        if (delta > 12) {
          // Each jolt adds energy and a short haptic tick — like rattling a real bowl.
          shakeEnergy += delta;
          haptic(14);

          var card = screens.shake && screens.shake.querySelector('.fortune-container');
          if (card) card.classList.add('is-charging');

          window.clearTimeout(decayTimer);
          decayTimer = window.setTimeout(function () {
            shakeEnergy = 0;
            if (card) card.classList.remove('is-charging');
          }, 600);

          if (shakeEnergy >= SHAKE_TRIGGER) {
            shakeEnergy = 0;
            revealFortune();
          }
        }
      }

      last = { x: x, y: y, z: z };
      lastAt = now;
    });
  }

  /* ---------- wiring ---------- */
  var actions = {
    'to-focus': function () {
      show('focus');
    },
    'begin-reveal': beginReveal,
    'reveal-fortune': revealFortune,
    share: shareFortune,
    'try-again': tryAgain,
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = actions[el.dataset.action];
    if (fn) {
      e.preventDefault();
      fn();
    }
  });

  // Prime the data early so the first tap feels instant; ignore failures here.
  loadFortunes().catch(function () {});

  // Local-only deep link for design QA, e.g. ?screen=result — never active in production.
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  var devScreen = new URLSearchParams(window.location.search).get('screen');
  if (isLocal && devScreen && screens[devScreen]) {
    if (devScreen === 'result') {
      loadFortunes().then(function () {
        pickFortune();
        renderResult(drawn);
        show('result');
      });
    } else {
      show(devScreen);
    }
  } else {
    show('opening');
  }
})();
