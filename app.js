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
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  var screens = {};
  var current = 'opening';
  var busy = false;
  var fortunes = null;
  var drawn = null;
  var motionEnabled = false; // devicemotion listener attached
  var motionEventSeen = false; // at least one devicemotion event has actually fired
  var motionArmed = false; // true only while the shake screen is showing
  var shakeEnergy = 0; // accumulates while the phone is being shaken, then decays
  var SHAKE_TRIGGER = 60; // energy needed to break the bowl open

  var IS_IOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* Haptics.
     - Android / Chrome: navigator.vibrate — real vibration.
     - iOS Safari: no vibration API exists at all. Best effort only: toggling a
       hidden <input type="checkbox" switch> plays the system toggle haptic on
       iOS 17.4+. It may do nothing on older iOS — there is no other web hook. */
  var iosHapticToggle = null;
  if (IS_IOS && document.body) {
    try {
      var wrap = document.createElement('span');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none';
      iosHapticToggle = document.createElement('input');
      iosHapticToggle.type = 'checkbox';
      iosHapticToggle.setAttribute('switch', '');
      iosHapticToggle.tabIndex = -1;
      wrap.appendChild(iosHapticToggle);
      document.body.appendChild(wrap);
    } catch (e) {
      iosHapticToggle = null;
    }
  }

  function haptic(pattern) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
        return;
      } catch (e) {
        /* fall through */
      }
    }
    if (iosHapticToggle) {
      try {
        iosHapticToggle.click();
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
    updateEnableShakeButton();
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
    prepareShareImage(); // render the shareable PNG now so Share can fire in-gesture
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
    haptic(18); // primes the vibrate motor and confirms the tap (Android)
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
    haptic([0, 35, 45, 70]); // the bowl cracks open (Android)
    announce('The bowl is shaking.');

    var card = screens.shake.querySelector('.fortune-container');
    var body = screens.shake.querySelector('.shake-body');
    if (REDUCED || !card) {
      resetCharge();
      goToResult();
      return;
    }

    // full-energy bloom, then a light flash — the visual "crack" (matters on iOS,
    // which has no haptic to sell the moment)
    card.style.setProperty('--charge', '1');
    card.classList.add('is-charging');
    if (body) body.classList.add('is-cracking');

    window.setTimeout(function () {
      card.classList.remove('is-charging');
      card.classList.add('is-shaking');
    }, 130);
    window.setTimeout(function () {
      card.classList.remove('is-shaking');
      card.classList.add('is-opening');
    }, SHAKE_ANIM_MS - 300);
    window.setTimeout(function () {
      card.classList.remove('is-opening');
      if (body) body.classList.remove('is-cracking');
      resetCharge();
      goToResult();
    }, SHAKE_ANIM_MS);
  }

  function tryAgain() {
    drawn = null;
    busy = false;
    sharePrep = null;
    sharePrepPromise = null;
    resetCharge();
    var card = screens.shake.querySelector('.fortune-container');
    if (card) card.classList.remove('is-shaking', 'is-opening');
    show('opening');
    announce('');
  }

  /* ---------- share / save the fortune slip as an image ---------- */
  function fileName() {
    return 'charm-fortune-' + pad2(drawn.id) + '.png';
  }
  function shareText() {
    return 'My fortune from CHARM at Sala Thai — ' + drawn.title + '. Food, luck, prosperity.';
  }

  // Load an image for canvas use. SVGs are fetched and handed to the Image as a
  // data: URI — that keeps the canvas untainted (Safari taints canvases that draw
  // an SVG loaded by URL), so toBlob()/toDataURL() keep working for sharing.
  function loadImage(src) {
    if (!src) return Promise.resolve(null);

    function fromUri(uri) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          resolve(img);
        };
        img.onerror = function () {
          resolve(null);
        };
        img.src = uri;
      });
    }

    if (/\.svg(\?|$)/i.test(src)) {
      return fetch(src)
        .then(function (r) {
          return r.ok ? r.text() : Promise.reject(new Error('svg ' + r.status));
        })
        .then(function (txt) {
          return fromUri('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt));
        })
        .catch(function () {
          return null;
        });
    }
    return fromUri(src);
  }

  /* Purpose-built 1080×1920 portrait — sized for an Instagram story, styled like
     the on-screen fortune slip. Returns a Promise<HTMLCanvasElement>. */
  function buildShareCanvas(f) {
    var W = 1080;
    var H = 1920;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    var INK = '#2b2727';
    var BROWN = '#3c2e21';
    var MUTED = '#8c7c72';
    var OLIVE = '#948439';
    var M = 112;
    var CW = W - M * 2;
    var cx = W / 2;

    function font(px, weight) {
      return (weight || 400) + ' ' + px + "px " + SANS;
    }
    function wrap(text, maxW) {
      var words = String(text == null ? '' : text).split(/\s+/);
      var lines = [];
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (line && ctx.measureText(test).width > maxW) {
          lines.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }
    function para(text, x, y, maxW, lh, align) {
      ctx.textAlign = align || 'left';
      var lines = wrap(text, maxW);
      for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lh);
      return y + lines.length * lh;
    }
    function starMark(x, y, r) {
      ctx.fillStyle = OLIVE;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.32, y - r * 0.32);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x + r * 0.32, y + r * 0.32);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.32, y + r * 0.32);
      ctx.lineTo(x - r, y);
      ctx.lineTo(x - r * 0.32, y - r * 0.32);
      ctx.closePath();
      ctx.fill();
    }
    function starDiv(y) {
      ctx.strokeStyle = OLIVE;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(M, y);
      ctx.lineTo(cx - 28, y);
      ctx.moveTo(cx + 28, y);
      ctx.lineTo(W - M, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      starMark(cx, y, 7);
      return y + 44;
    }

    return Promise.all([
      loadImage(f.luckyDish ? foodSrc(f.image) : null),
      loadImage('asset/app/charm-wordmark.svg'),
    ]).then(function (imgs) {
      var dishImg = imgs[0];
      var mark = imgs[1];

      ctx.fillStyle = '#faf7f2';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = OLIVE;
      ctx.lineWidth = 2;
      ctx.strokeRect(40.5, 40.5, W - 81, H - 81);

      ctx.textAlign = 'center';
      var y = 156;

      ctx.fillStyle = MUTED;
      ctx.font = font(20, 700);
      ctx.fillText('YOUR FORTUNE IS REVEALED', cx, y);
      y += 104;

      ctx.fillStyle = INK;
      ctx.font = font(116, 300);
      ctx.fillText(pad2(f.id), cx, y);
      y += 76;

      ctx.font = font(46, 700);
      var tLines = wrap((f.title || '').toUpperCase(), CW);
      for (var i = 0; i < tLines.length; i++) {
        ctx.fillText(tLines[i], cx, y);
        y += 56;
      }
      if (f.thaiTitle) {
        ctx.fillStyle = MUTED;
        ctx.font = font(28);
        ctx.fillText(f.thaiTitle, cx, y);
        y += 40;
      }
      y += 16;

      y = starDiv(y) + 20;
      ctx.fillStyle = OLIVE;
      ctx.font = font(19, 700);
      ctx.fillText('YOUR FORTUNE (OVERALL)', cx, y);
      y += 44;
      ctx.fillStyle = BROWN;
      ctx.font = font(27);
      y = para(f.overall, cx, y, CW, 39, 'center');
      y += 26;

      y = starDiv(y) + 22;
      var areas = [
        ['LOVE', '#d4a7a0', f.love],
        ['WEALTH', '#948439', f.wealth],
        ['WORK', '#97b3b0', f.workStudy],
        ['HEALTH', '#d66622', f.health],
      ];
      for (var a = 0; a < areas.length; a++) {
        ctx.fillStyle = areas[a][1];
        ctx.beginPath();
        ctx.arc(M + 9, y - 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = font(21, 700);
        ctx.textAlign = 'left';
        ctx.fillText(areas[a][0], M + 34, y);
        y += 34;
        ctx.fillStyle = BROWN;
        ctx.font = font(24);
        y = para(areas[a][2], M, y, CW, 34, 'left');
        y += 26;
      }

      y = starDiv(y) + 20;
      ctx.textAlign = 'center';
      ctx.fillStyle = OLIVE;
      ctx.font = font(19, 700);
      ctx.fillText(f.luckyDish ? 'YOUR LUCKY DISH' : 'YOUR LUCKY SIGN', cx, y);
      y += 42;
      if (f.luckyDish) {
        if (dishImg) {
          var dw = 210;
          var dh = 155;
          try {
            ctx.drawImage(dishImg, cx - dw / 2, y - 12, dw, dh);
          } catch (e) {
            /* ignore */
          }
          y += dh + 6;
        }
        ctx.fillStyle = INK;
        ctx.font = font(30, 700);
        ctx.fillText((f.luckyDish || '').toUpperCase(), cx, y);
        y += 36;
        if (f.luckyDishNote) {
          ctx.fillStyle = MUTED;
          ctx.font = font(23);
          y = para(f.luckyDishNote, cx, y, CW, 32, 'center');
        }
      } else if (f.luckySign) {
        ctx.fillStyle = BROWN;
        ctx.font = font(25);
        y = para(f.luckySign, cx, y, CW, 36, 'center');
      }
      y += 30;

      y = starDiv(y) + 46;
      if (mark) {
        var mw = 264;
        var mh = mw * (44 / 227);
        try {
          ctx.drawImage(mark, cx - mw / 2, y - mh, mw, mh);
        } catch (e) {
          /* ignore */
        }
        y += 54;
      }
      ctx.fillStyle = '#2b2626';
      ctx.font = font(21, 700);
      ctx.fillText('SALA THAI', cx, y);
      y += 28;
      ctx.fillStyle = '#8c7d73';
      ctx.font = font(17);
      ctx.fillText('307 Amsterdam Ave, New York, NY 10023', cx, y);

      ctx.fillStyle = OLIVE;
      ctx.font = font(17, 700);
      ctx.fillText('FOOD · LUCK · PROSPERITY', cx, Math.min(H - 120, y + 132));

      return canvas;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
      else {
        try {
          var bin = atob(canvas.toDataURL('image/png').split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (e) {
          resolve(null);
        }
      }
    });
  }

  /* Preferred path: rasterize the real on-screen slip so the shared image is an
     exact match of what the visitor saw. Uses html-to-image (SVG <foreignObject>
     — the browser's own layout engine, unlike html2canvas which re-implements
     CSS and drifts). Lazy-loaded; fortuneImage() falls back to the hand-drawn
     canvas above if it can't load. */
  var HTI_SRC = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
  var htiPromise = null;
  function loadHtmlToImage() {
    if (htiPromise) return htiPromise;
    htiPromise = new Promise(function (resolve, reject) {
      if (window.htmlToImage) {
        resolve(window.htmlToImage);
        return;
      }
      var s = document.createElement('script');
      s.src = HTI_SRC;
      s.async = true;
      s.onload = function () {
        if (window.htmlToImage) resolve(window.htmlToImage);
        else reject(new Error('html-to-image missing'));
      };
      s.onerror = function () {
        reject(new Error('html-to-image load failed'));
      };
      document.head.appendChild(s);
    });
    return htiPromise;
  }

  // Center the captured slip on a 1080×1920 cream field — a proper story canvas.
  function composeStory(slipCanvas) {
    var W = 1080;
    var H = 1920;
    var out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, W, H);

    var pad = 72;
    var scale = Math.min((W - pad * 2) / slipCanvas.width, (H - pad * 2 - 90) / slipCanvas.height, 1);
    var dw = slipCanvas.width * scale;
    var dh = slipCanvas.height * scale;
    var dx = (W - dw) / 2;
    var dy = Math.max(pad, (H - dh) / 2 - 48); // slight upward bias for the story UI
    ctx.drawImage(slipCanvas, dx, dy, dw, dh);

    ctx.fillStyle = '#948439';
    ctx.font = "700 17px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('FOOD · LUCK · PROSPERITY', W / 2, Math.min(H - 84, dy + dh + 60));

    return out;
  }

  var slipRenderedOnce = false;
  function renderSlipCanvas() {
    var slip = document.getElementById('slip');
    if (!slip) return Promise.reject(new Error('no slip element'));
    return loadHtmlToImage().then(function (hti) {
      var opts = {
        pixelRatio: 3, // ~1080px wide from the ~360px slip
        backgroundColor: '#faf7f2',
        skipFonts: true, // system font stack — nothing to embed
        cacheBust: true,
        style: { animation: 'none', opacity: '1', transform: 'none', boxShadow: 'none' },
      };
      // Safari renders the first foreignObject pass incompletely — warm it up once.
      var run = hti.toCanvas(slip, opts);
      if (!slipRenderedOnce) {
        slipRenderedOnce = true;
        run = run.then(function () {
          return hti.toCanvas(slip, opts);
        });
      }
      return run;
    }).then(composeStory);
  }

  function fortuneImage() {
    return renderSlipCanvas()
      .catch(function (err) {
        console.warn('[charm] slip capture failed — using drawn fallback:', err);
        return buildShareCanvas(drawn);
      })
      .then(canvasToBlob);
  }

  /* The image is rendered the moment the result screen appears and cached, so the
     Share tap can call navigator.share() synchronously — iOS Safari rejects a
     share that isn't fired directly from the user gesture. */
  var sharePrep = null; // { blob, file }
  var sharePrepPromise = null;
  function prepareShareImage() {
    sharePrep = null;
    sharePrepPromise = fortuneImage()
      .then(function (blob) {
        sharePrep = blob
          ? { blob: blob, file: new File([blob], fileName(), { type: 'image/png' }) }
          : null;
        return sharePrep;
      })
      .catch(function () {
        sharePrep = null;
        return null;
      });
    return sharePrepPromise;
  }

  function openOrDownload(blob) {
    var url = URL.createObjectURL(blob);
    if (IS_IOS) {
      window.open(url, '_blank'); // user long-presses → Save to Photos
      announce('Long-press the image, then choose Save to Photos.');
    } else {
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      announce('Fortune image saved.');
    }
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 10000);
  }

  function copyFallback() {
    var text = shareText() + '\n' + window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        announce('Fortune copied to clipboard.');
      }, function () {});
    }
  }

  function canShareFile(file) {
    return !!(navigator.canShare && file && navigator.canShare({ files: [file] }));
  }

  function shareFortune() {
    if (!drawn) return;
    haptic(12);

    // Fast path: image is ready → share it right now, inside this tap.
    if (sharePrep && canShareFile(sharePrep.file)) {
      navigator
        .share({ files: [sharePrep.file], text: shareText() })
        .then(function () {
          announce('Shared.');
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          openOrDownload(sharePrep.blob); // share sheet failed → hand over the file
        });
      return;
    }
    if (sharePrep) {
      // This browser can't share files (most desktops) — download the image instead.
      openOrDownload(sharePrep.blob);
      return;
    }

    // Image still rendering (rare — it starts on result screen load). Wait, then
    // save it; the gesture is spent so we can't open the share sheet this round.
    var btn = document.querySelector('[data-action="share"]');
    if (btn) btn.classList.add('is-busy');
    announce('Preparing your fortune image…');
    (sharePrepPromise || prepareShareImage()).then(function () {
      if (btn) btn.classList.remove('is-busy');
      if (sharePrep && canShareFile(sharePrep.file)) {
        openOrDownload(sharePrep.blob);
        announce('Image ready and saved — tap Share again to post it to a story.');
      } else if (sharePrep) {
        openOrDownload(sharePrep.blob);
      } else {
        copyFallback();
      }
    });
  }

  function saveImage() {
    if (!drawn) return;
    haptic(12);
    if (sharePrep) {
      openOrDownload(sharePrep.blob);
      return;
    }
    announce('Preparing your fortune image…');
    (sharePrepPromise || prepareShareImage()).then(function () {
      if (sharePrep) openOrDownload(sharePrep.blob);
      else copyFallback();
    });
  }

  /* ---------- device shake ---------- */
  function shakeCard() {
    return screens.shake && screens.shake.querySelector('.fortune-container');
  }

  function paintCharge() {
    var card = shakeCard();
    if (!card) return;
    var ratio = Math.min(1, shakeEnergy / SHAKE_TRIGGER);
    card.style.setProperty('--charge', ratio.toFixed(3));
    card.classList.toggle('is-charging', ratio > 0.04);
  }

  function resetCharge() {
    shakeEnergy = 0;
    var card = shakeCard();
    if (card) {
      card.style.setProperty('--charge', '0');
      card.classList.remove('is-charging');
    }
  }

  var chargeDecay = 0;
  // Shared by real device shakes and the local `s`-key simulator.
  function addShakeEnergy(amount) {
    if (!motionArmed || busy || current !== 'shake') return;
    shakeEnergy += amount;
    haptic(14); // a tick per jolt — like rattling a real bowl
    paintCharge();

    window.clearTimeout(chargeDecay);
    chargeDecay = window.setTimeout(resetCharge, 650);

    if (shakeEnergy >= SHAKE_TRIGGER) {
      window.clearTimeout(chargeDecay);
      revealFortune();
    }
  }

  function requestMotionPermission() {
    var DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      // iOS — must be called from a user gesture; returns 'granted' / 'denied'.
      DME.requestPermission()
        .then(function (state) {
          if (state === 'granted') {
            enableMotion();
            updateEnableShakeButton();
          }
        })
        .catch(function () {});
    } else if (DME) {
      enableMotion(); // Android / desktop Chrome — no prompt needed
    }
  }

  function enableMotion() {
    if (motionEnabled) return;
    motionEnabled = true;

    var last = null;
    var lastAt = 0;

    window.addEventListener('devicemotion', function (e) {
      motionEventSeen = true;
      updateEnableShakeButton();
      if (!motionArmed || busy) return;

      var a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;

      var now = Date.now();
      if (now - lastAt < 70) return;
      var x = a.x || 0;
      var y = a.y || 0;
      var z = a.z || 0;

      if (last) {
        var delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
        if (delta > 6) addShakeEnergy(delta); // low gate — accumulate; threshold does the rest
      }
      last = { x: x, y: y, z: z };
      lastAt = now;
    });
  }

  /* "Enable shake" affordance — shown only when motion needs a permission tap
     (iOS) or when no motion events are arriving despite being enabled. */
  function updateEnableShakeButton() {
    var btn = screens.shake && screens.shake.querySelector('.shake-enable');
    if (!btn) return;
    var DME = window.DeviceMotionEvent;
    var needsPrompt =
      DME && typeof DME.requestPermission === 'function' && !motionEnabled && !motionEventSeen;
    btn.hidden = !(current === 'shake' && needsPrompt);
  }

  function enableShake() {
    requestMotionPermission();
  }

  /* ---------- wiring ---------- */
  var actions = {
    'to-focus': function () {
      show('focus');
    },
    'begin-reveal': beginReveal,
    'reveal-fortune': revealFortune,
    'enable-shake': enableShake,
    share: shareFortune,
    'save-image': saveImage,
    'try-again': tryAgain,
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = actions[el.dataset.action];
    if (fn) {
      e.preventDefault();
      if (el.dataset.action !== 'reveal-fortune') haptic(10); // taps get a tick (Android)
      fn();
    }
  });

  // Local-only shake simulator: press "s" (or Space) on the shake screen to pump
  // energy, so the shake → charge → reveal loop is testable without a phone.
  if (isLocal) {
    window.addEventListener('keydown', function (e) {
      if (current !== 'shake') return;
      if (e.key === 's' || e.key === 'S' || e.key === ' ') {
        e.preventDefault();
        addShakeEnergy(22);
      }
    });
  }

  // Prime the data early so the first tap feels instant; ignore failures here.
  loadFortunes().catch(function () {});

  // Local-only deep link for design QA, e.g. ?screen=result — never active in production.
  // Add #share on the result screen to render the generated share image full-bleed.
  var devScreen = new URLSearchParams(window.location.search).get('screen');
  if (isLocal && devScreen && screens[devScreen]) {
    if (devScreen === 'result') {
      loadFortunes().then(function () {
        pickFortune();
        renderResult(drawn);
        show('result');
        if (window.location.hash === '#share') {
          renderSlipCanvas().then(function (c) {
            c.style.cssText = 'display:block;width:100%;height:auto';
            app.innerHTML = '';
            app.appendChild(c);
          });
        }
      });
    } else {
      show(devScreen);
    }
  } else {
    show('opening');
  }
})();
