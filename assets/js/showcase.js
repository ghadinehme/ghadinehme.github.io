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


  // ---------- Pre-rendered walkthrough videos with synced steps, code and timeline ----------
  function fmtCode(l) {
    return l.replace(/<c>/g, '<span class="c-c">').replace(/<\/c>/g, '</span>').replace(/<k>/g, '<span class="c-k">')
      .replace(/<\/k>/g, '</span>').replace(/<n>/g, '<span class="c-n">').replace(/<\/n>/g, '</span>');
  }
  function initVideoPanel(cfg) {
    var video = document.getElementById(cfg.video), stepsEl = document.getElementById(cfg.steps);
    var codeEl = document.getElementById(cfg.code), panel = document.getElementById(cfg.panel);
    if (!video || !stepsEl) return;
    var STAGES = cfg.stages, CODE = cfg.codeLines;
    var order = STAGES.map(function (s) { return s[0]; });
    var starts = [], acc = 0;
    STAGES.forEach(function (s) { starts.push(acc); acc += s[2]; });
    stepsEl.innerHTML = STAGES.map(function (s, i) {
      return '<li><button type="button"><span class="ic">' + (i + 1) + '</span>' + s[1] + '</button></li>';
    }).join('');
    var items = stepsEl.querySelectorAll('li');
    var curKey = '';
    function setStage(si, ms) {
      // code lines may carry a time (ms from video start) so they appear exactly when shown in the video
      var vis = CODE.filter(function (c) {
        var k = order.indexOf(c[0]);
        return k < si || (k === si && (c[2] == null || ms >= c[2]));
      });
      var key = si + ':' + vis.length;
      if (key === curKey) return; curKey = key;
      items.forEach(function (li, i) { li.classList.toggle('done', i < si); li.classList.toggle('active', i === si); });
      var timed = vis.filter(function (c) { return c[0] === order[si] && c[2] != null; });
      var latest = timed.length ? timed[timed.length - 1] : null;
      var html = vis.map(function (c) {
        var hot = c[0] === order[si] && (latest ? c === latest : true);
        return hot ? '<span class="c-new">' + fmtCode(c[1]) + '</span>' : fmtCode(c[1]);
      }).join('\n');
      codeEl.innerHTML = html || '<span class="c-c"># program appears here</span>';
      codeEl.scrollTop = codeEl.scrollHeight;
    }
    function sync() {
      var ms = (video.currentTime * 1000) % acc, si = 0;
      for (var i = 0; i < starts.length; i++) if (ms >= starts[i]) si = i;
      setStage(si, ms);
    }
    function seek(i) { video.currentTime = starts[i] / 1000 + 0.05; video.play().catch(function () {}); sync(); }
    video.addEventListener('timeupdate', sync);
    video.addEventListener('seeked', sync);
    items.forEach(function (li, i) { li.querySelector('button').addEventListener('click', function () { seek(i); }); });
    var tl = document.getElementById(cfg.timeline);
    if (tl) {
      tl.innerHTML = STAGES.map(function (s) {
        return '<button type="button" style="flex:' + s[2] + '" title="' + s[1] + '" aria-label="Jump to ' + s[1] + '"><i></i></button>';
      }).join('');
      var segs = tl.querySelectorAll('button');
      segs.forEach(function (b, i) { b.addEventListener('click', function () { seek(i); }); });
      var fillTL = function () {
        var ms = (video.currentTime * 1000) % acc;
        segs.forEach(function (b, i) { b.firstChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (ms - starts[i]) / STAGES[i][2])) + ')'; });
        if (!video.paused) requestAnimationFrame(fillTL);
      };
      video.addEventListener('play', function () { requestAnimationFrame(fillTL); });
      video.addEventListener('seeked', fillTL);
    }
    setStage(0, 0);
    function canPlay() { return !reduceMotion && !panel.hidden; }
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    var onScreen = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting;
      if (onScreen && canPlay()) video.play().catch(function () {}); else video.pause();
    }).observe(video);
    document.addEventListener('showcase:tab', function (e) {
      if (e.detail === cfg.tab && !reduceMotion) { video.preload = 'auto'; video.play().catch(function () {}); } else video.pause();
    });
  }

  function initCadfit() {
    initVideoPanel({
      video: 'cfVideo', steps: 'cfSteps', code: 'cfCode', timeline: 'cfTimeline', panel: 'panel-cadfit', tab: 'cadfit',
      stages: [['mesh', 'Input mesh', 3000], ['sketch', 'Extract sections', 4200], ['extrude', 'Search: Extrude height', 5200],
        ['revolve', 'Search: Revolve angle', 3800], ['greedy', 'IoU-guided selection', 3800],
        ['residual', 'Residual refinement', 5200], ['done', 'Construction sequence', 4200]],
      codeLines: [
        ['revolve', '<c># 1 · profile from an axis-aligned section</c>'],
        ['revolve', 'plane_1 = cq.Plane(origin, normal, xDir)'],
        ['revolve', 'sketch_1 = cq.Workplane(plane_1).moveTo(p0)'],
        ['revolve', 'sketch_1 = sketch_1.lineTo(p1)  <c># ×11</c>'],
        ['revolve', 'solid_1 = sketch_1.<k>revolve</k>(<n>360</n>, axisStart, axisEnd)'],
        ['greedy', 'result = solid_1  <c># IoU 0.952</c>'],
        ['residual', '<c># 2 · residual R⁺: missing belt teeth</c>'],
        ['residual', 'plane_2 = cq.Plane(origin, normal, xDir)'],
        ['residual', 'loop_2 = cq.Workplane(plane_2).moveTo(p0)'],
        ['residual', 'loop_2 = loop_2.threePointArc(p1, p2)  <c># ×48</c>'],
        ['residual', 'solid_2 = loop_2.<k>extrude</k>(<n>0.57</n>)'],
        ['residual', 'result = result.<k>union</k>(solid_2)  <c># IoU 0.993</c>']
      ]
    });
  }

  function initStepcad() {
    initVideoPanel({
      video: 'stVideo', steps: 'stSteps', code: 'stCode', timeline: 'stTimeline', panel: 'panel-stepcad', tab: 'stepcad',
      stages: [['mesh', 'Input mesh', 2800], ['pcl', 'Sample target point cloud', 2600], ['policy', 'LLM policy: step by step', 9600],
        ['refine', 'Search: refine parameters', 3400], ['sketch', 'Search: modify sketch', 3000],
        ['skip', 'Search: skip operation', 3200], ['done', 'CAD program', 3800]],
      codeLines: [
        ['policy', '<c># policy π(aₜ | target, current state)</c>', 5400],
        ['policy', 's = cq.Workplane(<n>"XY"</n>).rect(<n>80</n>, <n>50</n>).<k>extrude</k>(<n>10</n>)', 5400],
        ['policy', 's = s.union(profile(h=<n>22</n>).<k>revolve</k>(<n>360</n>))', 7000],
        ['policy', 's = s.<k>cut</k>(bore(r=<n>7</n>))', 8600],
        ['policy', 's = s.<k>cut</k>(slots(w=<n>10</n>))', 10200],
        ['policy', 's = s.union(block(<n>14</n>, <n>8</n>, <n>12</n>))', 11800],
        ['policy', 's = s.edges(<n>"|Z"</n>).<k>fillet</k>(<n>5</n>)  <c># IoU 0.874</c>', 13400],
        ['refine', '<c># edit 1 · refine: boss h 22 → 30   IoU 0.944</c>'],
        ['sketch', '<c># edit 2 · sketch: slot w 10 → 6    IoU 0.973</c>'],
        ['skip', '<c># edit 3 · skip block operation      IoU 0.999</c>']
      ]
    });
  }

  // ---------- LAMP ----------
  function initLamp() {
    var BASE = 'assets/showcase/lamp/';
    var img = document.getElementById('lampImg');
    var slider = document.getElementById('lampSlider');
    var zone = document.getElementById('lampZone');
    var paramEl = document.getElementById('lampParam');
    var chips = document.getElementById('lampChips');
    var view = document.getElementById('panel-lamp');
    var sweeps = [], cur = null, auto = !reduceMotion, dir = 1, timer = null, onScreen = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }).observe(view); else onScreen = true;

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
      if (!auto || cur === null || view.hidden || !onScreen || document.hidden) return;
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
      var curK = 4, shown = true;
      var basePick = pick;
      pick = function (k) { curK = k; basePick(k); };
      pick(4);
      // stop the GIF (show its poster) while the episode view is off screen
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
        var on = e[0].isIntersecting;
        if (on === shown) return; shown = on;
        video.src = BASE + vids[curK].id + (on && !reduceMotion ? '.gif' : '_poster.jpg');
      }).observe(video);
    });

    fetch(BASE + 'results.json').then(function (r) { return r.json(); }).then(function (res) {
      var g = document.getElementById('vcI2C');
      function tile(src, alt, label, cls) {
        return '<div class="vc-tile' + (cls ? ' ' + cls : '') + '"><img src="' + BASE + src + '" alt="' + alt + '" loading="lazy" width="400" height="400"><span>' + label + '</span></div>';
      }
      g.innerHTML = res.image2cad.map(function (p) {
        return '<figure class="vc-card">' + tile(p.target, 'Target image', 'Input image', 'in') +
          '<i class="vc-op">&rarr;</i>' + tile(p.result, 'CAD model built in Onshape by VideoCADFormer', 'Built in Onshape') + '</figure>';
      }).join('');
      var a = document.getElementById('vcAuto');
      a.innerHTML = res.autocomplete.map(function (p) {
        return '<figure class="vc-card three">' + tile(p.start, 'Partially built CAD model', 'Partial model') +
          '<i class="vc-op">+</i>' + tile(p.target, 'Target image', 'Target image', 'in') +
          '<i class="vc-op">&rarr;</i>' + tile(p.final, 'Completed CAD model', 'Completed') + '</figure>';
      }).join('');
    });
  }

  var initers = { lamp: initLamp, videocad: initVideoCAD };
  initCadfit();
  initStepcad();
  // deep links: #cadfit, #lamp, #videocad open that tab
  function fromHash() {
    var h = location.hash.slice(1);
    if (['cadfit', 'stepcad', 'lamp', 'videocad'].indexOf(h) !== -1) { show(h); root.scrollIntoView(); }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  var qTab = new URLSearchParams(location.search).get('sctab');   // ?sctab=lamp (previews)
  if (qTab && root.querySelector('.sc-tab[data-tab="' + qTab + '"]')) show(qTab);
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
