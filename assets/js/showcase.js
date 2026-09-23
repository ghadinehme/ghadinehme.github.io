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


  // ---------- CADFit (pre-rendered walkthrough video + synced steps/code) ----------
  function initCadfit() {
    var video = document.getElementById('cfVideo');
    var stepsEl = document.getElementById('cfSteps');
    var codeEl = document.getElementById('cfCode');
    if (!video || !stepsEl) return;
    var STAGES = [
      ['mesh', 'Input mesh', 3000], ['sketch', 'Extract sections', 4200], ['extrude', 'Search: Extrude height', 5200],
      ['revolve', 'Search: Revolve angle', 3800], ['greedy', 'IoU-guided selection', 4200],
      ['residual', 'Residual refinement', 3800], ['done', 'Construction sequence', 4200]
    ];
    var CODE = [
      ['extrude', '<c># 1 · profile from a planar face</c>'],
      ['extrude', 'plane_1 = cq.Plane(origin, normal, xDir)'],
      ['extrude', 'sketch_1 = cq.Workplane(plane_1)'],
      ['extrude', 'loop_1 = sketch_1.moveTo(p0)'],
      ['extrude', 'loop_1 = loop_1.threePointArc(p1, p2)  <c># ×48</c>'],
      ['extrude', 'solid_1 = sketch_1.<k>extrude</k>(<n>0.57</n>)'],
      ['revolve', '<c># 2 · profile from an axis-aligned section</c>'],
      ['revolve', 'plane_2 = cq.Plane(origin, normal, xDir)'],
      ['revolve', 'sketch_2 = cq.Workplane(plane_2).moveTo(p0)'],
      ['revolve', 'sketch_2 = sketch_2.lineTo(p1)  <c># ×11</c>'],
      ['revolve', 'solid_2 = sketch_2.<k>revolve</k>(<n>360</n>, axisStart, axisEnd)'],
      ['greedy', 'result = solid_2.<k>union</k>(solid_1)'],
      ['residual', '<c># 3 · residual refinement</c>'],
      ['residual', 'residual = ex_a.union(ex_b).union(ex_c)'],
      ['residual', 'result = result.<k>cut</k>(residual)']
    ];
    var order = STAGES.map(function (s) { return s[0]; });
    var starts = []; var acc = 0;
    STAGES.forEach(function (s) { starts.push(acc); acc += s[2]; });
    stepsEl.innerHTML = STAGES.map(function (s, i) {
      return '<li><button type="button"><span class="ic">' + (i + 1) + '</span>' + s[1] + '</button></li>';
    }).join('');
    var items = stepsEl.querySelectorAll('li');
    var tl = document.getElementById('cfTimeline');
    if (tl) {
      tl.innerHTML = STAGES.map(function (s, i) {
        return '<button type="button" style="flex:' + s[2] + '" title="' + s[1] + '" aria-label="Jump to ' + s[1] + '"><i></i></button>';
      }).join('');
      var segs = tl.querySelectorAll('button');
      segs.forEach(function (b, i) { b.addEventListener('click', function () { video.currentTime = starts[i] / 1000 + 0.05; video.play().catch(function () {}); sync(); }); });
      var fillTL = function () {
        var ms = (video.currentTime * 1000) % acc;
        segs.forEach(function (b, i) {
          var f = Math.max(0, Math.min(1, (ms - starts[i]) / STAGES[i][2]));
          b.firstChild.style.transform = 'scaleX(' + f + ')';
        });
        if (!video.paused) requestAnimationFrame(fillTL);
      };
      video.addEventListener('play', function () { requestAnimationFrame(fillTL); });
      video.addEventListener('seeked', fillTL);
    }
    function fmt(l) {
      return l.replace(/<c>/g, '<span class="c-c">').replace(/<\/c>/g, '</span>').replace(/<k>/g, '<span class="c-k">')
        .replace(/<\/k>/g, '</span>').replace(/<n>/g, '<span class="c-n">').replace(/<\/n>/g, '</span>');
    }
    var cur = -1;
    function setStage(si) {
      if (si === cur) return; cur = si;
      items.forEach(function (li, i) { li.classList.toggle('done', i < si); li.classList.toggle('active', i === si); });
      var html = CODE.filter(function (c) { return order.indexOf(c[0]) <= si; }).map(function (c) {
        return c[0] === order[si] ? '<span class="c-new">' + fmt(c[1]) + '</span>' : fmt(c[1]);
      }).join('\n');
      codeEl.innerHTML = html || '<span class="c-c"># construction sequence appears here</span>';
      codeEl.scrollTop = codeEl.scrollHeight;
    }
    function sync() {
      var ms = (video.currentTime * 1000) % acc, si = 0;
      for (var i = 0; i < starts.length; i++) if (ms >= starts[i]) si = i;
      setStage(si);
    }
    video.addEventListener('timeupdate', sync);
    video.addEventListener('seeked', sync);
    items.forEach(function (li, i) {
      li.querySelector('button').addEventListener('click', function () {
        video.currentTime = starts[i] / 1000 + 0.05; video.play().catch(function () {}); sync();
      });
    });
    setStage(0);
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); video.currentTime = starts[6] / 1000 + 1; }
    // only play while visible
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      if (reduceMotion) return;
      if (e[0].isIntersecting && !document.getElementById('panel-cadfit').hidden) video.play().catch(function () {});
      else video.pause();
    }).observe(video);
    document.addEventListener('showcase:tab', function (e) {
      if (e.detail === 'cadfit' && !reduceMotion) video.play().catch(function () {}); else video.pause();
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
