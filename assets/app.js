/* ===========================================================
   Padharo House — prototype interactions (vanilla JS)
   =========================================================== */
(function () {
  'use strict';

  /* ---- sticky header solid on scroll ---- */
  const header = document.querySelector('.site-header');
  const hasHero = document.body.classList.contains('has-hero');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('solid', window.scrollY > 40 || !hasHero);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => mobileNav.classList.toggle('hidden'));
    mobileNav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileNav.classList.add('hidden')));
  }

  /* ---- prototype ribbon dismiss ---- */
  const ribbon = document.getElementById('protoRibbon');
  const ribbonClose = document.getElementById('ribbonClose');
  if (ribbonClose && ribbon) ribbonClose.addEventListener('click', () => {
    ribbon.remove();
    if (header) header.style.top = '0';        // close the gap the ribbon left
    document.querySelectorAll('.ribbon-offset').forEach(el => el.style.paddingTop = '78px');
  });

  /* ---- reveal on scroll (with variants + auto stagger) ---- */
  document.querySelectorAll('.stagger').forEach(group => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-l, .reveal-r, .reveal-z').forEach(el => io.observe(el));

  /* ---- subtle hero parallax (skipped when reduced motion is preferred) ---- */
  const slidesWrap = document.querySelector('.hero .hero-slides');
  if (slidesWrap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let raf = null;
    window.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        slidesWrap.style.transform = 'translate3d(0,' + (y * 0.16) + 'px,0) scale(1.05)';
        raf = null;
      });
    }, { passive: true });
  }

  /* ---- lightbox gallery ---- */
  const lb = document.getElementById('lightbox');
  if (lb) {
    const lbImg = lb.querySelector('img');
    const items = Array.from(document.querySelectorAll('[data-lb]'));
    const srcs = items.map(el => el.getAttribute('data-lb'));
    let idx = 0;
    const show = i => { idx = (i + srcs.length) % srcs.length; lbImg.src = srcs[idx]; };
    items.forEach((el, i) => el.addEventListener('click', () => { lb.classList.add('open'); show(i); }));
    lb.querySelector('.lb-close').addEventListener('click', () => lb.classList.remove('open'));
    lb.querySelector('.lb-prev').addEventListener('click', e => { e.stopPropagation(); show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', e => { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ===========================================================
     BOOKING ENGINE (only runs if booking elements exist)
     =========================================================== */
  const calEl = document.getElementById('calendar');
  if (!calEl) return;

  const INR = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const MS_DAY = 86400000;
  const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const iso = d => d.toISOString().slice(0, 10);

  // demo pricing (all editable from admin in the real site)
  const BASE = 6500;                 // per night
  const WEEKEND = 1.25;              // Fri/Sat multiplier
  const TAX = 0.12;                  // 12% GST (<= 7500/night)
  const packages = {
    room:   { label: 'Stay Only',            add: 0 },
    guide:  { label: 'Stay + Local Guide',   add: 1500 },
    romance:{ label: 'Romantic Escape',      add: 2500 },
    culture:{ label: 'Cultural Retreat',     add: 3200 },
    family: { label: 'Family Getaway',       add: 2800 },
  };
  // no bookings yet — brand-new property (owner can block dates later from the admin)
  const booked = new Set();

  let viewDate = new Date(); viewDate.setDate(1);
  let start = null, end = null;
  let pkg = 'guide', guests = 2, promo = false;
  let quoteText = '';

  const nightRate = d => {
    const day = d.getDay();
    return (day === 5 || day === 6) ? BASE * WEEKEND : BASE;
  };

  function renderCalendar() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const first = new Date(y, m, 1), startDay = first.getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    document.getElementById('calMonth').textContent =
      viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    let html = '';
    ['S','M','T','W','T','F','S'].forEach(d => html += `<div class="text-center text-xs font-semibold text-[var(--muted)] py-1">${d}</div>`);
    for (let i = 0; i < startDay; i++) html += `<div class="cal-day muted"></div>`;
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d); date.setHours(0, 0, 0, 0);
      const key = iso(date);
      let cls = 'cal-day ';
      if (date < today) cls += 'muted';
      else if (booked.has(key)) cls += 'booked';
      else {
        cls += 'avail';
        if (start && end && date >= start && date <= end) cls += ' inrange';
        if ((start && +date === +start) || (end && +date === +end)) cls += ' sel';
      }
      if (+date === +today) cls += ' today';
      const clickable = date >= today && !booked.has(key);
      html += `<div class="${cls}" ${clickable ? `data-date="${key}"` : ''}>${d}</div>`;
    }
    calEl.innerHTML = html;
    calEl.querySelectorAll('[data-date]').forEach(el =>
      el.addEventListener('click', () => pick(new Date(el.getAttribute('data-date') + 'T00:00:00'))));
  }

  function rangeHasBooked(a, b) {
    for (let t = +a; t <= +b; t += MS_DAY) if (booked.has(iso(new Date(t)))) return true;
    return false;
  }

  function pick(date) {
    if (!start || (start && end)) { start = date; end = null; }
    else if (date <= start) { start = date; }
    else if (rangeHasBooked(start, date)) { start = date; end = null; }
    else { end = date; }
    renderCalendar(); renderSummary();
  }

  function renderSummary() {
    const box = document.getElementById('summary');
    const cta = document.getElementById('bookCta');
    if (!start || !end) {
      box.innerHTML = `<p class="text-[var(--muted)] text-sm py-6 text-center">Select your check-in and check-out dates on the calendar to see a live price breakdown.</p>`;
      if (cta) { cta.classList.add('opacity-50','pointer-events-none'); }
      quoteText = '';
      return;
    }
    if (cta) cta.classList.remove('opacity-50','pointer-events-none');
    const nights = Math.round((end - start) / MS_DAY);
    let room = 0;
    for (let t = +start; t < +end; t += MS_DAY) room += nightRate(new Date(t));
    const addon = packages[pkg].add * nights;
    const subtotalPre = room + addon;
    const discount = promo ? Math.round(subtotalPre * 0.10) : 0;
    const preTax = subtotalPre - discount;
    const tax = preTax * TAX;
    const total = preTax + tax;
    quoteText = `Dates: ${fmt(start)} to ${fmt(end)} (${nights} night${nights > 1 ? 's' : ''}) · ${packages[pkg].label} · ${guests} guest${guests > 1 ? 's' : ''} · Indicative total ${INR(total)}`;

    const row = (l, v, cls = '') => `<div class="flex justify-between py-1.5 ${cls}"><span>${l}</span><span>${v}</span></div>`;
    document.getElementById('summary').innerHTML = `
      <div class="flex items-center justify-between pb-3 mb-1 border-b border-[#eee5d9]">
        <div><div class="text-xs text-[var(--muted)]">Check-in</div><div class="font-semibold">${fmt(start)}</div></div>
        <div class="text-[var(--gold)]">&rarr;</div>
        <div class="text-right"><div class="text-xs text-[var(--muted)]">Check-out</div><div class="font-semibold">${fmt(end)}</div></div>
      </div>
      <div class="text-sm">
        ${row(`${INR(BASE)} avg &times; ${nights} night${nights>1?'s':''}`, INR(room))}
        ${addon ? row(`${packages[pkg].label} package`, INR(addon)) : ''}
        ${discount ? row('Promo GHAR10 (10% off)', '&minus; ' + INR(discount), 'text-[var(--terra)]') : ''}
        <div class="flex justify-between py-1.5 border-t border-[#eee5d9] mt-1"><span class="text-[var(--muted)]">Pre-tax subtotal</span><span class="font-semibold">${INR(preTax)}</span></div>
        ${row('GST (12%)', INR(tax), 'text-[var(--muted)]')}
      </div>
      <div class="flex justify-between items-center mt-2 pt-3 border-t-2 border-[var(--terra)]">
        <span class="font-serif text-lg">Total</span>
        <span class="font-serif text-2xl text-[var(--terra)]">${INR(total)}</span>
      </div>
      <p class="text-xs text-[var(--muted)] mt-1">Pay 25% now (${INR(total*0.25)}) to reserve, balance before check-in.</p>`;
  }

  // controls
  document.getElementById('calPrev').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });
  document.querySelectorAll('[data-pkg]').forEach(el => el.addEventListener('click', () => {
    pkg = el.getAttribute('data-pkg');
    document.querySelectorAll('[data-pkg]').forEach(x => x.classList.remove('ring-2','ring-[var(--terra)]','bg-[var(--cream)]'));
    el.classList.add('ring-2','ring-[var(--terra)]','bg-[var(--cream)]');
    renderSummary();
  }));
  const promoBox = document.getElementById('promo');
  if (promoBox) promoBox.addEventListener('input', e => { promo = e.target.value.trim().toUpperCase() === 'GHAR10'; renderSummary(); });
  const gEl = document.getElementById('guests');
  if (gEl) gEl.addEventListener('change', e => { guests = +e.target.value; });

  const cta = document.getElementById('bookCta');
  if (cta) cta.addEventListener('click', () => {
    if (!start || !end) return;
    const msg = 'Hi Padharo House, I would like to request a booking.' +
      (quoteText ? '\n\n' + quoteText : '') +
      '\n\nPlease confirm availability and the final price. Thank you!';
    window.open('https://wa.me/919461884005?text=' + encodeURIComponent(msg), '_blank');
  });

  // init: preselect the default package + a demo range
  renderCalendar();
  const dp = document.querySelector('[data-pkg="guide"]');
  if (dp) dp.classList.add('ring-2','ring-[var(--terra)]','bg-[var(--cream)]');
  renderSummary();
})();

/* ===========================================================
   HERO SLIDER (home) — autoplay cross-fade + arrows + dots
   =========================================================== */
(function () {
  'use strict';
  const wrap = document.querySelector('.hero .hero-slides');
  if (!wrap) return;
  const slides = Array.from(wrap.querySelectorAll('.slide'));
  if (slides.length < 2) return;

  const dotsBox = document.querySelector('.hero-dots');
  const DUR = 5500;
  let i = 0, timer = null;

  const dots = slides.map((_, idx) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
    b.addEventListener('click', () => go(idx, true));
    if (dotsBox) dotsBox.appendChild(b);
    return b;
  });

  function render() {
    slides.forEach((s, n) => s.classList.toggle('active', n === i));
    dots.forEach((d, n) => d.classList.toggle('active', n === i));
  }
  function go(n, user) { i = (n + slides.length) % slides.length; render(); if (user) restart(); }
  function restart() { clearInterval(timer); timer = setInterval(() => go(i + 1), DUR); }

  const next = document.querySelector('.hero-arrow.next');
  const prev = document.querySelector('.hero-arrow.prev');
  if (next) next.addEventListener('click', () => go(i + 1, true));
  if (prev) prev.addEventListener('click', () => go(i - 1, true));

  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', restart);
  }

  render();
  restart();
})();
