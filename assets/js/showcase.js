// Research showcase: tabs, LAMP parameter slider, VideoCAD episodes and results.
(function () {
  var root = document.getElementById('research');
  if (!root) return;

  // ---------- tabs ----------
  var tabs = root.querySelectorAll('.sc-tab');
  var panels = root.querySelectorAll('.sc-panel');
  var inited = {};
  function show(name) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
    });
    panels.forEach(function (p) {
      var on = p.getAttribute('data-panel') === name;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
    if (!inited[name] && initers[name]) { inited[name] = true; initers[name](); }
    document.dispatchEvent(new CustomEvent('showcase:tab', { detail: name }));
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-tab')); }); });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- LAMP ----------
  function initLamp() {
    var BASE = 'assets/showcase/lamp/';
    var img = document.getElementById('lampImg');
    var slider = document.getElementById('lampSlider');
    var zone = document.getElementById('lampZone');
    var paramEl = document.getElementById('lampParam');
    var chips = document.getElementById('lampChips');
    var view = document.getElementById('panel-lamp');
    var sweeps = [], cur = null, auto = !reduceMotion, dir = 1, timer = null;

    function setFrame(i) {
      var s = sweeps[cur];
      i = Math.max(0, Math.min(s.frames.length - 1, i));
      slider.value = i;
      img.src = BASE + s.frames[i];
      var p = s.pos[i];                       // 0..1 along the slider; the middle third is the training range
      var inRange = p >= 1 / 3 && p <= 2 / 3;
      var pct = inRange ? 0 : Math.round((p < 1 / 3 ? (1 / 3 - p) : (p - 2 / 3)) * 300);
      zone.textContent = inRange ? 'Within training range' : 'Extrapolating ' + (p < 1 / 3 ? '−' : '+') + Math.min(100, Math.round(pct / 5) * 5) + '%';
      zone.className = inRange ? 'in' : 'ex';
      slider.style.setProperty('--p', (i / (s.frames.length - 1) * 100) + '%');
    }
    function pick(k) {
      cur = k;
      var s = sweeps[k];
      slider.max = s.frames.length - 1;
      paramEl.textContent = s.car + ' · ' + s.param;
      chips.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('active', j === k); });
      s.frames.forEach(function (f) { var im = new Image(); im.src = BASE + f; });   // preload
      setFrame(Math.floor(s.frames.length / 2));
    }
    function tick() {
      if (!auto || cur === null || view.hidden) return;
      var s = sweeps[cur], i = +slider.value + dir;
      if (i >= s.frames.length - 1 || i <= 0) dir = -dir;
      setFrame(i);
    }
    fetch(BASE + 'sweeps.json').then(function (r) { return r.json(); }).then(function (data) {
      // put a varied set first: one per car/parameter family
      var orderIds = ['03_supra_roof', '05_porsche_front_bumper', '04_chr_length', 'lamp_s6_8', '02_porsche_ramp', 'lamp_s6_2', 'lamp_s2_10', 'lamp_s6_6'];
      sweeps = orderIds.map(function (id) { return data.find(function (d) { return d.id === id; }); }).filter(Boolean);
      chips.innerHTML = sweeps.map(function (s, k) { return '<button type="button" data-k="' + k + '">' + s.car + ' · ' + s.param + '</button>'; }).join('');
      chips.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { auto = false; pick(+b.getAttribute('data-k')); }); });
      pick(0);
      timer = setInterval(tick, 420);
    });
    slider.addEventListener('input', function () { auto = false; setFrame(+slider.value); });

    var opt = document.getElementById('lampOptBtn'), optView = document.getElementById('lampOpt');
    if (opt) opt.addEventListener('click', function () {
      var on = optView.hidden;
      optView.hidden = !on;
      opt.textContent = on ? 'Back to parameter sweeps' : 'Show drag optimization';
    });
  }

  // ---------- VideoCAD ----------
  function initVideoCAD() {
    var BASE = 'assets/showcase/videocad/';
    var video = document.getElementById('vcVideo');
    var idEl = document.getElementById('vcId');
    var target = document.getElementById('vcTarget');
    var picker = document.getElementById('vcPicker');
    var modes = document.querySelectorAll('.vc-mode');
    var views = document.querySelectorAll('.vc-pane');

    modes.forEach(function (m) {
      m.addEventListener('click', function () {
        var name = m.getAttribute('data-mode');
        modes.forEach(function (x) { x.classList.toggle('active', x === m); });
        views.forEach(function (v) { v.hidden = v.getAttribute('data-mode') !== name; });
      });
    });

    fetch(BASE + 'videos.json').then(function (r) { return r.json(); }).then(function (vids) {
      picker.innerHTML = vids.map(function (v, k) {
        return '<button type="button" data-k="' + k + '" aria-label="Episode ' + v.id + '"><img src="' + BASE + v.id + '_target.png" alt="" loading="lazy"></button>';
      }).join('');
      function pick(k) {
        var v = vids[k];
        picker.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('active', j === k); });
        video.src = BASE + (reduceMotion ? v.id + '_poster.jpg' : v.id + '.gif');
        idEl.textContent = '#' + v.id;
        target.src = BASE + v.id + '_target.png';
      }
      picker.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { pick(+b.getAttribute('data-k')); }); });
      pick(4);
    });

    fetch(BASE + 'results.json').then(function (r) { return r.json(); }).then(function (res) {
      var g = document.getElementById('vcI2C');
      g.innerHTML = res.image2cad.map(function (p) {
        return '<figure class="vc-pair"><div class="t"><img src="' + BASE + p.target + '" alt="Target image" loading="lazy"><span>Input image</span></div>' +
          '<div class="r"><img src="' + BASE + p.result + '" alt="CAD model built in Onshape by VideoCADFormer" loading="lazy"><span>Built in Onshape</span></div></figure>';
      }).join('');
      var a = document.getElementById('vcAuto');
      a.innerHTML = res.autocomplete.map(function (p) {
        return '<figure class="vc-trip"><div><img src="' + BASE + p.start + '" alt="Intermediate CAD state" loading="lazy"><span>Partial model</span></div>' +
          '<div class="t"><img src="' + BASE + p.target + '" alt="Target image" loading="lazy"><span>Target</span></div>' +
          '<div><img src="' + BASE + p.final + '" alt="Completed CAD model" loading="lazy"><span>Completed</span></div></figure>';
      }).join('');
    });
  }

  var initers = { lamp: initLamp, videocad: initVideoCAD };
  // deep links: #cadfit, #lamp, #videocad open that tab
  function fromHash() {
    var h = location.hash.slice(1);
    if (['cadfit', 'lamp', 'videocad'].indexOf(h) !== -1) { show(h); root.scrollIntoView(); }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  var qTab = new URLSearchParams(location.search).get('sctab');   // ?sctab=lamp (previews)
  if (qTab && initers[qTab]) show(qTab);
  // preload the other panels once the section is near the viewport
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) {
        ['lamp'].forEach(function (n) { if (!inited[n]) { inited[n] = true; initers[n](); } });
        io.disconnect();
      }
    }, { rootMargin: '300px' });
    io.observe(root);
  }
})();
