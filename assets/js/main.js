(function () {
  var root = document.documentElement;

  // Theme toggle
  var themeBtn = document.getElementById('themeBtn');
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Mobile menu
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  menuBtn.addEventListener('click', function () {
    var open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') navLinks.classList.remove('open');
  });

  // Nav border + back-to-top on scroll
  var nav = document.querySelector('.nav');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 8);
    toTop.classList.toggle('show', y > 900);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Scrollspy
  var links = Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });

    // Reveal on scroll
    var rev = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { rev.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // News: show first 7, toggle the rest
  var NEWS_VISIBLE = 7;
  var newsItems = document.querySelectorAll('#newsList li');
  var newsBtn = document.getElementById('newsMore');
  if (newsItems.length <= NEWS_VISIBLE) {
    newsBtn.hidden = true;
  } else {
    var expanded = false;
    var applyNews = function () {
      newsItems.forEach(function (li, i) { li.classList.toggle('hidden', !expanded && i >= NEWS_VISIBLE); });
      newsBtn.textContent = expanded ? 'Show less' : 'Show all news (' + newsItems.length + ')';
    };
    newsBtn.addEventListener('click', function () { expanded = !expanded; applyNews(); });
    applyNews();
  }

  // Publication filters
  var filters = document.querySelectorAll('.filter');
  var pubs = document.querySelectorAll('.pub');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      pubs.forEach(function (p) {
        var tags = (p.getAttribute('data-tags') || '').split(' ');
        var show = f === 'all' || tags.indexOf(f) !== -1;
        p.classList.toggle('hidden', !show);
        if (show) p.classList.add('in');
      });
    });
  });

  // BibTeX toggle + copy
  document.querySelectorAll('.bib-btn').forEach(function (btn) {
    var pre = btn.closest('.pub').querySelector('.bibtex');
    if (!pre) return;
    var copy = document.createElement('button');
    copy.className = 'btn copy';
    copy.type = 'button';
    copy.innerHTML = '<svg><use href="#i-copy"/></svg>Copy';
    pre.appendChild(copy);
    copy.addEventListener('click', function () {
      var text = pre.childNodes[0].textContent.trim();
      var done = function () { copy.lastChild.textContent = 'Copied'; setTimeout(function () { copy.lastChild.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
    btn.addEventListener('click', function () { pre.classList.toggle('open'); });
  });

  // Animated preview on hover (e.g. VideoCAD demo)
  document.querySelectorAll('img[data-hover]').forEach(function (img) {
    var still = img.getAttribute('src');
    var anim = img.getAttribute('data-hover');
    var card = img.closest('.pub') || img;
    var preloaded = false;
    card.addEventListener('mouseenter', function () {
      if (!preloaded) { new Image().src = anim; preloaded = true; }
      img.src = anim;
    });
    card.addEventListener('mouseleave', function () { img.src = still; });
  });

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
