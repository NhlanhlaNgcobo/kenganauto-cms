import { api, API_BASE, TENANT_ID, DASHBOARD_URL } from './api.js';

/* ── helpers ─────────────────────────────────────────────── */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (n) => `R ${Math.round(n).toLocaleString('en-ZA')}`;
const km = (n) => `${Number(n).toLocaleString('en-ZA')} km`;
const COND = { new: 'New', demo: 'Demo', used: 'Pre-owned' };
const RATE = 11.75;
const SA_MOBILE = /^(\+27|0)\d{9}$/;

function monthly(price, deposit = 0, months = 72) {
  const p = Math.max(0, price - deposit); const r = RATE / 100 / 12;
  return p ? Math.round((p * r) / (1 - Math.pow(1 + r, -months))) : 0;
}

function countTo(el, to, { prefix = 'R ', duration = 700 } = {}) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = to;
  if (reduceMotion || from === to) { el.textContent = `${prefix}${Math.round(to).toLocaleString('en-ZA')}`; return; }
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / duration);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = `${prefix}${Math.round(from + (to - from) * e).toLocaleString('en-ZA')}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const withTransition = (fn) => (!reduceMotion && document.startViewTransition ? document.startViewTransition(fn) : fn());

let toastTimer;
function toast(msg) {
  const el = $('[data-toast]');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" stroke-opacity=".25"/><path d="m15 25 6 6 12-14"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .3-3.3-.7a11.5 11.5 0 0 1-4.5-4c-.3-.5-1-1.6-1-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.7-.1l1-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4Z"/></svg>',
};

/* ── state ───────────────────────────────────────────────── */
const state = { stock: [], profile: null, filters: { condition: '', make: '', budget: Infinity, sort: 'price-desc' } };

function filtered(f = state.filters) {
  const list = state.stock.filter((v) =>
    (!f.condition || v.condition === f.condition) && (!f.make || v.make === f.make) && v.price <= f.budget);
  const by = {
    'price-desc': (a, b) => b.price - a.price,
    'price-asc': (a, b) => a.price - b.price,
    newest: (a, b) => (a.days_in_stock ?? 999) - (b.days_in_stock ?? 999),
    'km-asc': (a, b) => (a.mileage ?? 0) - (b.mileage ?? 0),
  }[f.sort];
  return list.sort(by);
}

/* ── inventory ───────────────────────────────────────────── */
function carCard(v, i) {
  const badge = v.status === 'reserved' ? '<span class="badge reserved">Reserved</span>'
    : v.condition === 'new' ? '<span class="badge new">New</span>'
    : v.condition === 'demo' ? '<span class="badge">Demo</span>' : '';
  return `
    <button class="car enter" style="--i:${i}" type="button" data-car="${v.id}" aria-label="${esc(v.title)} ${esc(v.variant)}, ${rand(v.price)}">
      <div class="car-media">
        ${v.images[0] ? `<img src="${esc(v.images[0])}" alt="" loading="lazy" decoding="async" />` : ''}
        ${badge}
      </div>
      <div class="car-body">
        <div>
          <div class="car-title">${esc(v.title)}</div>
          <div class="car-variant">${esc(v.variant || '')}</div>
        </div>
        <div class="car-specs"><span>${km(v.mileage ?? 0)}</span><span>${esc(v.colour || '')}</span><span>${COND[v.condition] || ''}</span></div>
        <div class="car-foot">
          <span class="price">${rand(v.price)}</span>
          <span class="pm">from <strong>${rand(v.est_monthly)}</strong> pm</span>
        </div>
      </div>
    </button>`;
}

function renderGrid({ animate = true } = {}) {
  const list = filtered();
  const grid = $('[data-grid]');
  const update = () => {
    grid.innerHTML = list.map(carCard).join('');
    if (!animate) $$('.car', grid).forEach((c) => c.classList.remove('enter'));
    $('[data-inv-count]').textContent = `${list.length} car${list.length === 1 ? '' : 's'}`;
    $('[data-empty]').hidden = list.length > 0;
  };
  animate ? withTransition(update) : update();
}

function updateQuickCount() {
  const f = new FormData($('[data-quick-search]'));
  const n = filtered({ ...state.filters, make: f.get('make') || '', condition: f.get('condition') || '', budget: Number(f.get('budget')) || Infinity }).length;
  $('[data-qs-count]').textContent = `Show ${n} car${n === 1 ? '' : 's'}`;
}

function setCondition(cond) {
  state.filters.condition = cond;
  $$('[data-cond]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cond === cond)));
}

function bindFilters() {
  $$('[data-cond]').forEach((b) => b.addEventListener('click', () => { setCondition(b.dataset.cond); renderGrid(); }));
  $('[data-filter-make]').addEventListener('change', (e) => { state.filters.make = e.target.value; renderGrid(); });
  $('[data-sort]').addEventListener('change', (e) => { state.filters.sort = e.target.value; renderGrid(); });
  const budget = $('[data-budget]'); const out = $('[data-budget-out]');
  const showBudget = () => { const v = Number(budget.value); out.textContent = v >= Number(budget.max) ? 'Any' : rand(v); };
  budget.addEventListener('input', () => { state.filters.budget = Number(budget.value) >= Number(budget.max) ? Infinity : Number(budget.value); showBudget(); renderGrid({ animate: false }); });
  showBudget();
  $('[data-reset]').addEventListener('click', () => {
    setCondition(''); state.filters.make = ''; state.filters.budget = Infinity;
    $('[data-filter-make]').value = ''; budget.value = budget.max; showBudget(); renderGrid();
  });
  $('[data-grid]').addEventListener('click', (e) => {
    const card = e.target.closest('[data-car]');
    if (card) openSheet(Number(card.dataset.car));
  });

  const qs = $('[data-quick-search]');
  qs.addEventListener('change', updateQuickCount);
  qs.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(qs);
    setCondition(f.get('condition') || '');
    state.filters.make = f.get('make') || ''; $('[data-filter-make]').value = state.filters.make;
    const b = Number(f.get('budget')) || Infinity; state.filters.budget = b;
    budget.value = Number.isFinite(b) ? b : budget.max; showBudget();
    renderGrid();
    $('#inventory').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

/* ── vehicle sheet ───────────────────────────────────────── */
const contactFields = (consentText) => `
  <div class="field-row">
    <label>Full name<input name="name" autocomplete="name" required /></label>
    <label>Mobile<input name="phone" inputmode="tel" autocomplete="tel" placeholder="082 123 4567" required /></label>
  </div>
  <label>Email (optional)<input name="email" type="email" autocomplete="email" /></label>
  <label class="consent"><input type="checkbox" name="popia_consent" required /> ${consentText}</label>`;

function sheetHtml(v) {
  const today = new Date().toISOString().slice(0, 10);
  const wa = `https://wa.me/${(state.profile?.phone || '+27105550199').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi Acme Cars, I'm interested in the ${v.title} ${v.variant} (${v.stock_number}).`)}`;
  return `
    <div class="sheet-top">
      <a class="logo" href="#top" data-close-sheet aria-label="Back to Acme Cars">
        <svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path class="logo-a" d="M14 50 L30 12 h4 L50 50"/><path class="logo-bar" d="M20 38 L46 32"/></svg>
        <span class="logo-word"><span class="logo-acme">ACME</span><span class="logo-cars">CARS</span></span>
      </a>
      <button class="sheet-close" type="button" aria-label="Close" data-close-sheet>${ICON.close}</button>
    </div>
    <div class="sheet-grid">
      <div>
        <div class="sheet-photo">${v.images[0] ? `<img src="${esc(v.images[0])}" alt="${esc(`${v.title} in ${v.colour}`)}" />` : ''}</div>
        <h2 id="sheet-title">${esc(v.title)}</h2>
        <p class="sheet-variant">${esc(v.variant || '')} · ${esc(v.colour || '')}</p>
        <dl class="spec-list">
          <div><dt>Year</dt><dd>${v.year}</dd></div>
          <div><dt>Mileage</dt><dd>${km(v.mileage ?? 0)}</dd></div>
          <div><dt>Condition</dt><dd>${COND[v.condition] || ''}</dd></div>
          <div><dt>Colour</dt><dd>${esc(v.colour || '')}</dd></div>
          <div><dt>Stock no.</dt><dd>${esc(v.stock_number)}</dd></div>
          <div><dt>Status</dt><dd>${v.status === 'reserved' ? 'Reserved' : 'Available'}</dd></div>
        </dl>
        ${v.features?.length ? `<ul class="feature-list">${v.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${v.description ? `<p class="sheet-desc">${esc(v.description)}</p>` : ''}
      </div>
      <aside class="sheet-aside">
        <div class="sheet-price">
          <span class="price">${rand(v.price)}</span>
          <span class="pm">Est. <strong>${rand(v.est_monthly)}</strong> pm · 10% deposit · 72 months · ${RATE}%</span>
        </div>

        ${v.status === 'available' ? `
        <div class="buy-cta">
          <div><strong>Buy it online</strong><span>Structure your deal and reserve the car. No payment now; we hold it for 48 hours.</span></div>
          <button class="btn btn-primary" type="button" data-open-buy aria-controls="tp-buy" aria-expanded="false">Start ${ICON.arrow}</button>
        </div>` : '<p class="buy-reserved">This car is reserved. Ask us about similar stock below.</p>'}

        <div class="tab-panel" id="tp-buy" hidden>
          <form class="form-card buy-form" data-form="online-deal" data-vehicle="${v.id}" data-price="${v.price}" novalidate>
            <fieldset class="buy-step">
              <legend><span>1</span> How will you pay?</legend>
              <div class="choice" role="radiogroup" aria-label="Payment">
                <label><input type="radio" name="payment_method" value="finance" checked /> Finance</label>
                <label><input type="radio" name="payment_method" value="cash" /> Cash</label>
              </div>
              <div class="field-row" data-when="finance">
                <label>Deposit<input name="deposit" inputmode="numeric" value="${Math.round(v.price * 0.1)}" /></label>
                <label>Term<select name="term_months"><option value="60">60 months</option><option value="72" selected>72 months</option><option value="84">84 months</option></select></label>
              </div>
            </fieldset>
            <fieldset class="buy-step">
              <legend><span>2</span> Trading in?</legend>
              <label class="consent"><input type="checkbox" name="has_trade" /> I have a car to trade in</label>
              <div data-when="trade" hidden>
                <div class="field-row">
                  <label>Year<input name="t_year" inputmode="numeric" placeholder="2019" required disabled /></label>
                  <label>Mileage (km)<input name="t_mileage" inputmode="numeric" placeholder="98 000" required disabled /></label>
                </div>
                <div class="field-row">
                  <label>Make<input name="t_make" placeholder="Toyota" required disabled /></label>
                  <label>Model<input name="t_model" placeholder="Fortuner 2.4" required disabled /></label>
                </div>
              </div>
            </fieldset>
            <fieldset class="buy-step">
              <legend><span>3</span> Collect or deliver?</legend>
              <div class="choice" role="radiogroup" aria-label="Collection">
                <label><input type="radio" name="fulfilment" value="collect" checked /> Collect in Sandton</label>
                <label><input type="radio" name="fulfilment" value="delivery" /> Deliver to me</label>
              </div>
              <label>Date<input name="fulfilment_date" type="date" min="${today}" value="${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}" required /></label>
              <label data-when="delivery" hidden>Delivery address<input name="delivery_address" autocomplete="street-address" required disabled /></label>
            </fieldset>
            <fieldset class="buy-step">
              <legend><span>4</span> Your details</legend>
              ${contactFields('I agree that Acme Cars may process my details to prepare this deal (POPIA).')}
            </fieldset>
            <p class="buy-total" data-buy-total aria-live="polite"></p>
            <button class="btn btn-primary btn-block" type="submit">Reserve this car ${ICON.arrow}</button>
            <p class="form-note">No payment is taken online. Trade-in values are estimates until we inspect the car.</p>
            <p class="form-status" role="status" aria-live="polite"></p>
          </form>
        </div>

        <div class="tabs" role="tablist" aria-label="What would you like to do?">
          <button role="tab" aria-selected="true" aria-controls="tp-drive" id="tb-drive" type="button">Test drive</button>
          <button role="tab" aria-selected="false" aria-controls="tp-ask" id="tb-ask" type="button" tabindex="-1">Enquire</button>
          <button role="tab" aria-selected="false" aria-controls="tp-fin" id="tb-fin" type="button" tabindex="-1">Finance</button>
          <button role="tab" aria-selected="false" aria-controls="tp-trade" id="tb-trade" type="button" tabindex="-1">Trade-in</button>
        </div>

        <div class="tab-panel" role="tabpanel" id="tp-drive" aria-labelledby="tb-drive">
          <form class="form-card" data-form="test_drive" data-vehicle="${v.id}" novalidate>
            <div class="field-row">
              <label>Preferred day<input name="preferred_date" type="date" min="${today}" value="${today}" /></label>
              <label>Time<select name="preferred_time"><option>09:00</option><option selected>10:30</option><option>12:00</option><option>14:00</option><option>16:00</option></select></label>
            </div>
            ${contactFields('I agree that Acme Cars may contact me to arrange this test drive (POPIA).')}
            <button class="btn btn-primary btn-block" type="submit">Book my test drive ${ICON.arrow}</button>
            <p class="form-status" role="status" aria-live="polite"></p>
          </form>
        </div>

        <div class="tab-panel" role="tabpanel" id="tp-ask" aria-labelledby="tb-ask" hidden>
          <form class="form-card" data-form="enquiry" data-vehicle="${v.id}" novalidate>
            <label>Your question<textarea name="message" rows="3" placeholder="Is the service history available? Can you deliver to Pretoria?"></textarea></label>
            ${contactFields('I agree that Acme Cars may contact me about this vehicle (POPIA).')}
            <button class="btn btn-primary btn-block" type="submit">Send enquiry ${ICON.arrow}</button>
            <p class="form-status" role="status" aria-live="polite"></p>
          </form>
        </div>

        <div class="tab-panel" role="tabpanel" id="tp-fin" aria-labelledby="tb-fin" hidden>
          <form class="form-card" data-form="finance" data-vehicle="${v.id}" data-price="${v.price}" novalidate>
            <div class="field-row">
              <label>Deposit<input name="deposit" inputmode="numeric" value="${Math.round(v.price * 0.1)}" /></label>
              <label>Term<select name="term_months"><option value="60">60 months</option><option value="72" selected>72 months</option><option value="84">84 months</option></select></label>
            </div>
            <div class="field-row">
              <label>Gross monthly income<input name="monthly_income" inputmode="numeric" placeholder="R 45 000" required /></label>
              <label>Employment<select name="employment_status"><option value="permanent">Permanent</option><option value="contract">Contract</option><option value="self_employed">Self-employed</option></select></label>
            </div>
            ${contactFields('I agree that Acme Cars may process my details to assess finance (POPIA).')}
            <button class="btn btn-primary btn-block" type="submit">Get pre-qualified ${ICON.arrow}</button>
            <p class="form-status" role="status" aria-live="polite"></p>
          </form>
        </div>

        <div class="tab-panel" role="tabpanel" id="tp-trade" aria-labelledby="tb-trade" hidden>
          <form class="form-card" data-form="trade-in" data-vehicle="${v.id}" novalidate>
            <div class="field-row">
              <label>Year<input name="year" inputmode="numeric" placeholder="2019" required /></label>
              <label>Mileage (km)<input name="mileage" inputmode="numeric" placeholder="98 000" required /></label>
            </div>
            <div class="field-row">
              <label>Make<input name="make" placeholder="Toyota" required /></label>
              <label>Model<input name="model" placeholder="Fortuner 2.4" required /></label>
            </div>
            <input type="hidden" name="condition" value="good" />
            ${contactFields('I agree that Acme Cars may contact me about this valuation (POPIA).')}
            <button class="btn btn-primary btn-block" type="submit">Value my car ${ICON.arrow}</button>
            <p class="form-status" role="status" aria-live="polite"></p>
          </form>
        </div>

        <a class="wa-link" href="${wa}" target="_blank" rel="noopener">${ICON.wa} Chat about this car on WhatsApp</a>
      </aside>
    </div>`;
}

function bindTabs(root) {
  const tabs = $$('[role="tab"]', root);
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`, root).hidden = !on;
    });
    const buy = $('#tp-buy', root); if (buy) buy.hidden = true;
    $('[data-open-buy]', root)?.setAttribute('aria-expanded', 'false');
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus(); select(next);
    });
  });
}

function openSheet(id, { fromHash = false } = {}) {
  const v = state.stock.find((x) => x.id === id);
  if (!v) return;
  const dialog = $('[data-sheet]'); const body = $('[data-sheet-body]');
  body.innerHTML = sheetHtml(v);
  bindTabs(body);
  $$('form[data-form]', body).forEach(bindForm);
  bindBuy(body, v);
  $$('[data-close-sheet]', body).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); closeSheet(); }));
  body.scrollTop = 0;
  if (!dialog.open) dialog.showModal();
  document.documentElement.style.overflow = 'hidden';
  if (!fromHash) history.pushState({ car: id }, '', `#car-${id}`);
  api.track(id); // → "Viewed …" in the dealer's live activity feed
}

function closeSheet({ fromPop = false } = {}) {
  const dialog = $('[data-sheet]');
  if (!dialog.open) return;
  const done = () => { dialog.classList.remove('closing'); dialog.close(); document.documentElement.style.overflow = ''; };
  if (reduceMotion) done(); else { dialog.classList.add('closing'); setTimeout(done, 300); }
  if (!fromPop && location.hash.startsWith('#car-')) history.pushState({}, '', '#inventory');
}

/* ── buy online (structure the deal, reserve the car) ───────── */
function markReserved(id) {
  const car = state.stock.find((x) => x.id === id);
  if (car) { car.status = 'reserved'; renderGrid({ animate: false }); }
  $('.buy-cta')?.remove();
}

function bindBuy(root, v) {
  const open = $('[data-open-buy]', root); const panel = $('#tp-buy', root);
  if (!open || !panel) return;
  const form = $('form', panel);
  open.addEventListener('click', () => {
    $$('[role="tab"]', root).forEach((t) => { t.setAttribute('aria-selected', 'false'); $(`#${t.getAttribute('aria-controls')}`, root).hidden = true; });
    panel.hidden = false; open.setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    $('input[name="payment_method"]:checked', form).focus({ preventScroll: true });
  });
  const show = (sel, on) => $$(sel, form).forEach((el) => { el.hidden = !on; $$('input', el).forEach((i) => { i.disabled = !on; }); if (el.tagName === 'INPUT') el.disabled = !on; });
  const total = $('[data-buy-total]', form);
  const update = () => {
    const f = new FormData(form);
    const finance = f.get('payment_method') === 'finance';
    show('[data-when="finance"]', finance);
    show('[data-when="trade"]', !!f.get('has_trade'));
    show('[data-when="delivery"]', f.get('fulfilment') === 'delivery');
    const deposit = Math.min(v.price * 0.5, digits(f.get('deposit')));
    total.textContent = finance
      ? `About ${rand(monthly(v.price, deposit, Number(f.get('term_months')) || 72))} per month at ${RATE}%, before any trade-in.`
      : `Total ${rand(v.price)}, before any trade-in.`;
  };
  form.addEventListener('input', update); form.addEventListener('change', update);
  update();
}

/* ── forms → KenganAuto ──────────────────────────────────── */
const digits = (s) => Number(String(s || '').replace(/\D/g, ''));

function validate(form) {
  let first = null;
  $$('input, select, textarea', form).forEach((el) => {
    if (el.disabled) return;
    let bad = false;
    if (el.type === 'checkbox') bad = el.required && !el.checked;
    else if (el.required) bad = !el.value.trim();
    if (!bad && el.name === 'phone') bad = !SA_MOBILE.test(el.value.replace(/[^\d+]/g, ''));
    if (!bad && el.type === 'email' && el.value) bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value);
    el.setAttribute('aria-invalid', String(bad));
    if (bad && !first) first = el;
  });
  if (first) {
    first.focus();
    const msg = first.type === 'checkbox' ? 'Please tick the consent box so we can contact you.'
      : first.name === 'phone' ? 'Please enter a South African mobile number, e.g. 082 123 4567.'
      : 'Please complete the highlighted field.';
    return msg;
  }
  return null;
}

function successHtml(title, message, next) {
  return `<div class="form-success">${ICON.check}<h4>${esc(title)}</h4><p>${esc(message)}</p>${next ? `<p class="form-note">${esc(next)}</p>` : ''}</div>`;
}

function payload(form) {
  const f = Object.fromEntries(new FormData(form).entries());
  f.popia_consent = !!form.querySelector('[name="popia_consent"]')?.checked;
  if (form.dataset.vehicle) f.vehicle_id = Number(form.dataset.vehicle);
  return f;
}

const SUBMIT = {
  test_drive: (f) => api.enquiry({ ...f, kind: 'test_drive' }),
  enquiry: (f) => api.enquiry({ ...f, kind: 'enquiry' }),
  finance: (f, form) => api.finance({
    ...f,
    monthly_income: digits(f.monthly_income),
    vehicle_price: Number(form.dataset.price) || calcValues().price,
    deposit: f.deposit != null ? digits(f.deposit) : calcValues().deposit,
    term_months: Number(f.term_months) || calcValues().term,
  }),
  'trade-in': (f) => api.tradeIn({ ...f, year: Number(f.year), mileage: digits(f.mileage) }),
  service: (f) => api.service(f),
  'online-deal': (f) => api.onlineDeal({
    vehicle_id: f.vehicle_id, payment_method: f.payment_method, deposit: digits(f.deposit), term_months: Number(f.term_months) || 72,
    fulfilment: f.fulfilment, fulfilment_date: f.fulfilment_date, delivery_address: f.delivery_address,
    trade_in: f.has_trade ? { year: Number(f.t_year), make: f.t_make, model: f.t_model, mileage: digits(f.t_mileage), condition: 'good' } : null,
    name: f.name, phone: f.phone, email: f.email, popia_consent: f.popia_consent,
  }),
};
const TITLES = { test_drive: 'Test drive requested', enquiry: 'Enquiry sent', finance: 'Application received', 'trade-in': 'Inspection booked', service: 'Service booked', 'online-deal': 'Car reserved' };

function bindForm(form) {
  if (form.dataset.bound) return; form.dataset.bound = '1';
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = form.dataset.form;
    const status = $('.form-status', form);
    status.className = 'form-status'; status.textContent = '';
    // Trade-in on the homepage is two-step: estimate first
    if (kind === 'trade-in' && form.closest('#trade-in') && $('[data-step="2"]', form).hidden) { $('[data-estimate]', form).click(); return; }
    const err = validate(form);
    if (err) { status.classList.add('error'); status.textContent = err; return; }
    const btn = $('button[type="submit"]', form);
    btn.setAttribute('aria-busy', 'true'); const label = btn.innerHTML; btn.textContent = 'Sending…';
    try {
      const res = await SUBMIT[kind](payload(form), form);
      const next = kind === 'finance' && res.est_monthly ? `Estimated instalment: ${rand(res.est_monthly)} per month.` : kind === 'trade-in' && res.min ? `Your estimate: ${rand(res.min)} – ${rand(res.max)}.`
        : kind === 'online-deal' ? `Reference ${res.reference}${res.est_monthly ? ` · about ${rand(res.est_monthly)} per month` : ''}${res.trade_in ? ` · trade-in estimate ${rand(res.trade_in.min)} – ${rand(res.trade_in.max)}` : ''}.` : null;
      if (kind === 'online-deal') markReserved(Number(form.dataset.vehicle));
      form.innerHTML = successHtml(TITLES[kind], res.message, next);
      toast(`${TITLES[kind]}. The Acme Cars team has it now.`);
    } catch (ex) {
      btn.removeAttribute('aria-busy'); btn.innerHTML = label;
      status.classList.add('error'); status.textContent = ex.message;
    }
  });
}

/* ── homepage trade-in (estimate → capture) ──────────────── */
function bindTradeEstimate() {
  const form = $('#trade-in [data-form="trade-in"]');
  $('[data-estimate]', form).addEventListener('click', async () => {
    const step1 = $('[data-step="1"]', form);
    const status = $('.form-status', form); status.className = 'form-status'; status.textContent = '';
    const missing = $$('input[required]', step1).find((el) => !el.value.trim());
    if (missing) { missing.setAttribute('aria-invalid', 'true'); missing.focus(); status.classList.add('error'); status.textContent = 'Please fill in year, make, model and mileage.'; return; }
    const btn = $('[data-estimate]', form); btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Valuing…';
    try {
      const f = Object.fromEntries(new FormData(form).entries());
      const est = await api.tradeEstimate({ year: Number(f.year), make: f.make, model: f.model, mileage: digits(f.mileage), condition: f.condition });
      const result = $('[data-trade-result]', form); result.hidden = false;
      const range = $('[data-trade-range]', form);
      range.textContent = `${rand(est.min)} – ${rand(est.max)}`;
      if (!reduceMotion) { const a = document.createElement('span'); range.textContent = ''; range.append(a, ' – ', document.createElement('span')); countTo(range.children[0], est.min); countTo(range.children[1], est.max); }
      $('[data-step="2"]', form).hidden = false;
      btn.textContent = 'Update estimate';
      $('[data-step="2"] input[name="name"]', form).focus({ preventScroll: true });
    } catch (ex) {
      btn.textContent = 'Get my estimate'; status.classList.add('error'); status.textContent = ex.message;
    } finally { btn.removeAttribute('aria-busy'); }
  });
}

/* ── finance calculator ─────────────────────────────────── */
function calcValues() {
  const g = (k) => Number($(`[data-calc-input="${k}"]`).value);
  return { price: g('price'), deposit: Math.min(g('deposit'), g('price') * 0.5), term: g('term') };
}
function bindCalc() {
  const update = () => {
    const { price, deposit, term } = calcValues();
    $('[data-out="price"]').textContent = rand(price);
    $('[data-out="deposit"]').textContent = rand(deposit);
    $('[data-out="term"]').textContent = `${term} months`;
    countTo($('[data-calc-monthly]'), monthly(price, deposit, term), { duration: 450 });
  };
  $$('[data-calc-input]').forEach((el) => el.addEventListener('input', update));
  update();
}

/* ── chrome: header, reveals, menu, demo bar, chat ───────── */
function bindChrome() {
  const header = $('[data-header]');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 40);
    // presenter bar stays out of the hero so it never covers the search
    document.querySelector('[data-demo-bar]')?.classList.toggle('tucked', y < window.innerHeight * 0.7);
    header.classList.toggle('hide', y > 600 && y > lastY && !document.querySelector('[data-mobile-menu]:not([hidden])'));
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -12% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else $$('.reveal').forEach((el) => el.classList.add('in'));

  // current-section underline in the nav
  const links = $$('.nav a');
  const io2 = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['inventory', 'finance', 'trade-in', 'service', 'visit'].forEach((id) => io2.observe(document.getElementById(id)));

  const menuBtn = $('[data-menu-btn]'); const menu = $('[data-mobile-menu]');
  const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); header.classList.toggle('scrolled', open || scrollY > 40); };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  $$('[data-scroll-inventory]').forEach((a) => a.addEventListener('click', () => toast('Choose a car, then tap "Test drive".')));
  $$('[data-min-today]').forEach((el) => { el.min = new Date().toISOString().slice(0, 10); });
  $('[data-year]').textContent = new Date().getFullYear();

  // Presenter aid: link straight to the dealer's dashboard
  const bar = $('[data-demo-bar]');
  let hidden = false; try { hidden = sessionStorage.getItem('acme_demo_bar') === 'off'; } catch { /* ignore */ }
  if (!hidden) bar.hidden = false;
  $('[data-dashboard-link]').href = DASHBOARD_URL;
  $('[data-demo-close]').addEventListener('click', () => { bar.hidden = true; try { sessionStorage.setItem('acme_demo_bar', 'off'); } catch { /* ignore */ } });

  // KenganAuto AI chat widget — conversations land in the dashboard's AI Chat inbox
  const s = document.createElement('script');
  s.src = `${API_BASE}/widget.js`; s.async = true;
  s.dataset.tenant = TENANT_ID; s.dataset.api = API_BASE;
  document.body.appendChild(s);

  const dialog = $('[data-sheet]');
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeSheet(); });
  addEventListener('popstate', () => {
    const m = /^#car-(\d+)$/.exec(location.hash);
    if (m) openSheet(Number(m[1]), { fromHash: true }); else closeSheet({ fromPop: true });
  });
}

/* ── boot ────────────────────────────────────────────────── */
async function boot() {
  const root = document.documentElement;
  root.classList.add('js', 'is-loading');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-loading')));

  bindChrome(); bindFilters(); bindCalc(); bindTradeEstimate();
  $$('form[data-form]').forEach(bindForm);
  $('[data-grid]').innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton"></div>').join('');

  try {
    const [profile, stock] = await Promise.all([api.profile().catch(() => null), api.stock()]);
    state.profile = profile; state.stock = stock;
    if (profile?.phone) {
      $('[data-phone-link]').href = `tel:${profile.phone}`;
      $('[data-phone-text]').textContent = profile.phone.replace(/^\+27(\d{2})(\d{3})(\d{4})$/, '0$1 $2 $3');
    }
    if (profile?.address) $('[data-address]').textContent = `${profile.address}, ${profile.city || ''}`.replace(/, $/, '');

    const makes = [...new Set(stock.map((v) => v.make))].sort();
    const opts = makes.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    $('[data-make-select]').insertAdjacentHTML('beforeend', opts);
    $('[data-filter-make]').insertAdjacentHTML('beforeend', opts);

    const hero = stock.find((v) => v.model === 'Ranger') || stock[0];
    const img = $('[data-hero-img]');
    img.alt = hero ? `${hero.title} in ${hero.colour}` : '';
    const ready = () => document.body.classList.add('ready');
    img.addEventListener('load', ready, { once: true }); img.addEventListener('error', ready, { once: true });
    img.src = hero?.images?.[0] || '';
    setTimeout(ready, 1500); // never hold the hero hostage to a slow image

    renderGrid({ animate: false });
    $$('.car').forEach((c) => c.classList.add('enter'));
    updateQuickCount();

    const m = /^#car-(\d+)$/.exec(location.hash);
    if (m) openSheet(Number(m[1]), { fromHash: true });
  } catch (ex) {
    document.body.classList.add('ready');
    $('[data-grid]').innerHTML = `<p class="empty">We couldn't load our live stock just now. Please refresh, or call us on 010 555 0199.</p>`;
    console.error(ex);
  }
}

boot();
