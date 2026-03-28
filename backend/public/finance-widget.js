/**
 * KenganAuto Finance Widget — Standalone Embeddable
 * ══════════════════════════════════════════════════
 *
 * Drop into any dealership website with ONE script tag:
 *
 *   <div id="ka-finance-widget"></div>
 *   <script src="https://api.kenganauto.co.za/public/finance-widget.js"
 *     data-tenant="YOUR_TENANT_ID"
 *     data-color="#C9A84C"
 *     data-name="XYZ Motors" async></script>
 *
 * The script auto-injects styles, renders the calculator, and
 * POSTs a lead to KenganAuto CRM when the customer submits.
 *
 * Build: No bundler required — pure vanilla JS (~8KB)
 * Serves from: backend/public/finance-widget.js
 */

(function () {
    'use strict';

    /* ── Config from script tag attributes ── */
    const script = document.currentScript || document.querySelector('[src*="finance-widget.js"]');
    const CONFIG = {
        tenantId: script?.dataset?.tenant || 'demo',
        primaryColor: script?.dataset?.color || '#C9A84C',
        dealershipName: script?.dataset?.name || 'KenganAuto',
        containerId: script?.dataset?.container || 'ka-finance-widget',
        apiBase: script?.dataset?.api || 'https://api.kenganauto.co.za',
    };

    /* ── SA Finance Constants ── */
    const SA = {
        prime: 11.25,
        spread: 3.5,
        get rate() { return this.prime + this.spread; },
        initFee: 1388.63,
        svcFee: 79.35,
        insRate: 0.0035 / 12,
    };

    /* ── Core calculator (no dependencies) ── */
    function pmt(P, annualRate, n, B) {
        B = B || 0;
        if (P <= 0) return 0;
        var r = (annualRate / 100) / 12;
        if (r === 0) return (P - B) / n;
        var pv = P - B * Math.pow(1 + r, -n);
        return (pv * r) / (1 - Math.pow(1 + r, -n));
    }

    function calc(price, deposit, term, rate, balloonPct) {
        var principal = price - deposit;
        var totalP = principal + SA.initFee;
        var balloon = Math.round(price * balloonPct / 100);
        var ins = Math.round(principal * SA.insRate);
        var finance = pmt(totalP, rate, term, balloon);
        var monthly = Math.round(finance + SA.svcFee + ins);
        var total = monthly * term + balloon;
        var interest = total - price + deposit;
        return { monthly: monthly, total: Math.round(total), interest: Math.round(interest), balloon: balloon, ins: ins };
    }

    function fmt(n) {
        return 'R ' + Math.round(n).toLocaleString('en-ZA');
    }

    /* ── Inject CSS ── */
    function injectStyles() {
        var c = CONFIG.primaryColor;
        var css = `
#ka-fw-root{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F0EDE8;background:#0D1526;border-radius:20px;padding:28px;max-width:480px;box-shadow:0 24px 80px rgba(0,0,0,0.6);border:1px solid ${c}22;}
#ka-fw-root *{box-sizing:border-box;}
.ka-title{font-size:20px;font-weight:900;margin:0 0 4px;color:#fff;}
.ka-sub{font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:${c}88;margin:0 0 24px;}
.ka-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:rgba(240,237,232,0.4);display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.ka-label span{color:${c};font-size:13px;font-weight:900;}
.ka-track{position:relative;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:16px;}
.ka-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,${c}88,${c});transition:width .1s;}
.ka-thumb{position:absolute;top:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:${c};border:2px solid #0A0F1E;cursor:pointer;}
.ka-range{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.ka-pills{display:flex;gap:6px;margin-bottom:16px;}
.ka-pill{flex:1;text-align:center;padding:8px 4px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:rgba(240,237,232,0.4);font-size:11px;font-weight:900;cursor:pointer;transition:all .15s;}
.ka-pill.active{background:${c}18;border-color:${c}55;color:${c};}
.ka-divider{height:1px;background:${c}14;margin:16px 0;}
.ka-result{background:linear-gradient(135deg,#060D1A,#0D1F3C);border:1px solid ${c}33;border-radius:16px;padding:24px;position:relative;overflow:hidden;margin:20px 0;}
.ka-shine{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${c}77,transparent);}
.ka-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.3em;color:${c}77;margin:0 0 4px;}
.ka-amount{font-size:48px;font-weight:900;color:#fff;margin:0 0 16px;}
.ka-sm{font-size:12px;color:rgba(240,237,232,0.3);margin-left:4px;}
.ka-row{display:flex;gap:8px;margin-bottom:8px;}
.ka-box{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;}
.ka-box p:first-child{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(240,237,232,0.3);margin:0 0 2px;}
.ka-box p:last-child{font-size:13px;font-weight:900;color:#fff;margin:0;}
.ka-warn{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 12px;font-size:11px;color:#F87171;margin-bottom:12px;}
.ka-apr{display:inline-flex;align-items:center;gap:6px;background:rgba(59,127,245,.08);border:1px solid rgba(59,127,245,.15);border-radius:8px;padding:6px 10px;font-size:10px;color:rgba(240,237,232,0.5);margin-top:8px;}
.ka-apr b{color:#fff;}
.ka-input-wrap{position:relative;margin-bottom:16px;}
.ka-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid ${c}22;border-radius:12px;padding:10px 12px;color:#F0EDE8;font-size:13px;outline:none;transition:border .2s;}
.ka-input:focus{border-color:${c}55;background:rgba(255,255,255,0.07);}
.ka-btn{width:100%;padding:16px;font-size:13px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;border:none;border-radius:14px;background:linear-gradient(135deg,${c},${c}99);color:#0A0F1E;cursor:pointer;margin-top:4px;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.ka-btn:hover{box-shadow:0 8px 30px ${c}55;transform:translateY(-1px);}
.ka-legal{font-size:9px;color:rgba(240,237,232,0.2);line-height:1.6;margin-top:12px;}
.ka-form{margin-top:12px;display:none;}
.ka-form.active{display:block;}
.ka-form-title{font-size:13px;font-weight:900;color:#fff;margin:0 0 12px;}
.ka-row-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}
.ka-success{text-align:center;padding:24px;display:none;}
.ka-success.active{display:block;}
.ka-success-icon{font-size:40px;margin-bottom:12px;}
.ka-success-title{font-size:18px;font-weight:900;color:#fff;margin:0 0 8px;}
.ka-success-msg{font-size:12px;color:rgba(240,237,232,0.5);margin:0;}
`;
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ── Build HTML ── */
    function buildHTML() {
        return `
<div id="ka-fw-root">
  <h3 class="ka-title">Finance Calculator</h3>
  <p class="ka-sub">${CONFIG.dealershipName} · NCA Compliant · ZAR · Prime ${SA.prime}%</p>

  <!-- Calculator view -->
  <div id="ka-calc-view">
    <!-- Vehicle Price -->
    <div class="ka-label">Vehicle Price <span id="ka-price-val">R 750,000</span></div>
    <div class="ka-track">
      <div class="ka-fill" id="ka-price-fill" style="width:33%"></div>
      <input class="ka-range" type="range" id="ka-price" min="100000" max="3000000" step="25000" value="750000">
    </div>

    <!-- Deposit -->
    <div class="ka-label">Deposit (0–30%) <span id="ka-dep-val">R 75,000 (10%)</span></div>
    <div class="ka-track">
      <div class="ka-fill" id="ka-dep-fill" style="width:10%"></div>
      <input class="ka-range" type="range" id="ka-deposit" min="0" max="30" step="1" value="10">
    </div>

    <div class="ka-divider"></div>

    <!-- Term -->
    <div class="ka-label">Loan Term</div>
    <div class="ka-pills" id="ka-terms">
      <button class="ka-pill" data-val="24">24m</button>
      <button class="ka-pill" data-val="36">36m</button>
      <button class="ka-pill" data-val="48">48m</button>
      <button class="ka-pill active" data-val="60">60m</button>
      <button class="ka-pill" data-val="72">72m</button>
      <button class="ka-pill" data-val="84">84m</button>
    </div>

    <!-- Balloon -->
    <div class="ka-label">Balloon Payment</div>
    <div class="ka-pills" id="ka-balloons">
      <button class="ka-pill active" data-val="0">0%</button>
      <button class="ka-pill" data-val="10">10%</button>
      <button class="ka-pill" data-val="20">20%</button>
      <button class="ka-pill" data-val="30">30%</button>
    </div>

    <!-- Balloon warning -->
    <div class="ka-warn" id="ka-bwarn" style="display:none"></div>

    <!-- Result -->
    <div class="ka-result">
      <div class="ka-shine"></div>
      <p class="ka-lbl">Estimated Monthly Payment</p>
      <p class="ka-amount"><span id="ka-monthly">R 7,150</span><span class="ka-sm">/month</span></p>
      <div class="ka-row">
        <div class="ka-box"><p>Total Repayable</p><p id="ka-total"></p></div>
        <div class="ka-box"><p>Total Interest</p><p id="ka-interest" style="color:#F87171"></p></div>
      </div>
      <div class="ka-apr">APR: <b id="ka-apr-val">14.75%</b> · Prime ${SA.prime}% + ${SA.spread}% · Subject to approval</div>
    </div>

    <button class="ka-btn" id="ka-apply-btn">
      ✓ Apply for Finance — 5 Minutes
    </button>

    <p class="ka-legal">
      Estimates include R1,388.63 initiation fee (NCR) + R79.35/month service fee + credit life insurance.
      Subject to National Credit Act 34 of 2005 · NCR Registered Dealer · ${CONFIG.dealershipName}
    </p>
  </div>

  <!-- Lead capture form -->
  <div class="ka-form" id="ka-form-view">
    <p class="ka-form-title">📋 Start Your Finance Application</p>
    <div class="ka-row-2">
      <div class="ka-input-wrap">
        <input class="ka-input" id="ka-fname" type="text" placeholder="First Name *">
      </div>
      <div class="ka-input-wrap">
        <input class="ka-input" id="ka-lname" type="text" placeholder="Last Name *">
      </div>
    </div>
    <div class="ka-input-wrap">
      <input class="ka-input" id="ka-phone" type="tel" placeholder="Phone Number * (+27...)">
    </div>
    <div class="ka-input-wrap">
      <input class="ka-input" id="ka-email" type="email" placeholder="Email Address">
    </div>
    <button class="ka-btn" id="ka-submit-btn">Submit Application → CRM</button>
    <button style="background:none;border:none;color:rgba(240,237,232,0.3);margin-top:8px;cursor:pointer;font-size:11px;width:100%;text-align:center" id="ka-back-btn">← Back to Calculator</button>
  </div>

  <!-- Success -->
  <div class="ka-success" id="ka-success-view">
    <div class="ka-success-icon">🎉</div>
    <p class="ka-success-title">Application Received!</p>
    <p class="ka-success-msg" id="ka-success-msg">Our finance team will contact you within 30 minutes.</p>
  </div>
</div>`;
    }

    /* ── Widget Logic ── */
    function initWidget() {
        var container = document.getElementById(CONFIG.containerId);
        if (!container) return;
        container.innerHTML = buildHTML();

        /* State */
        var state = { price: 750000, depositPct: 10, term: 60, balloon: 0 };

        function update() {
            var dep = Math.round(state.price * state.depositPct / 100);
            var result = calc(state.price, dep, state.term, SA.rate, state.balloon);

            // Values
            document.getElementById('ka-price-val').textContent = 'R ' + state.price.toLocaleString('en-ZA');
            document.getElementById('ka-dep-val').textContent = 'R ' + dep.toLocaleString('en-ZA') + ' (' + state.depositPct + '%)';
            document.getElementById('ka-monthly').textContent = fmt(result.monthly);
            document.getElementById('ka-total').textContent = fmt(result.total);
            document.getElementById('ka-interest').textContent = fmt(result.interest);

            // APR estimate
            var apr = Math.round(SA.rate * 102) / 100;
            document.getElementById('ka-apr-val').textContent = apr + '%';

            // Fills
            var pFill = ((state.price - 100000) / (3000000 - 100000)) * 100;
            document.getElementById('ka-price-fill').style.width = pFill + '%';
            document.getElementById('ka-dep-fill').style.width = state.depositPct / 30 * 100 + '%';

            // Balloon warning
            var bwarn = document.getElementById('ka-bwarn');
            if (state.balloon > 0) {
                bwarn.style.display = 'block';
                bwarn.textContent = '⚠ Balloon of ' + fmt(result.balloon) + ' due at Month ' + state.term + '. Not included in monthly payment.';
            } else {
                bwarn.style.display = 'none';
            }
        }

        /* Sliders */
        document.getElementById('ka-price').addEventListener('input', function (e) {
            state.price = +e.target.value; update();
        });
        document.getElementById('ka-deposit').addEventListener('input', function (e) {
            state.depositPct = +e.target.value; update();
        });

        /* Term pills */
        document.getElementById('ka-terms').addEventListener('click', function (e) {
            var pill = e.target.closest('.ka-pill');
            if (!pill) return;
            document.querySelectorAll('#ka-terms .ka-pill').forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
            state.term = +pill.dataset.val; update();
        });

        /* Balloon pills */
        document.getElementById('ka-balloons').addEventListener('click', function (e) {
            var pill = e.target.closest('.ka-pill');
            if (!pill) return;
            document.querySelectorAll('#ka-balloons .ka-pill').forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
            state.balloon = +pill.dataset.val; update();
        });

        /* Apply → show form */
        document.getElementById('ka-apply-btn').addEventListener('click', function () {
            document.getElementById('ka-calc-view').style.display = 'none';
            document.getElementById('ka-form-view').classList.add('active');
        });

        /* Back */
        document.getElementById('ka-back-btn').addEventListener('click', function () {
            document.getElementById('ka-calc-view').style.display = '';
            document.getElementById('ka-form-view').classList.remove('active');
        });

        /* Submit lead */
        document.getElementById('ka-submit-btn').addEventListener('click', function () {
            var fname = document.getElementById('ka-fname').value.trim();
            var lname = document.getElementById('ka-lname').value.trim();
            var phone = document.getElementById('ka-phone').value.trim();
            var email = document.getElementById('ka-email').value.trim();

            if (!fname || !phone) {
                alert('Please provide your first name and phone number.');
                return;
            }

            var dep = Math.round(state.price * state.depositPct / 100);
            var result = calc(state.price, dep, state.term, SA.rate, state.balloon);

            var payload = {
                customer_name: fname + ' ' + lname,
                customer_phone: phone,
                customer_email: email,
                source: 'website',
                notes: 'Finance Calculator Widget: ' + fmt(state.price) + ' | ' + state.depositPct + '% dep | ' + state.term + 'm | ' + fmt(result.monthly) + '/mth',
                metadata: { vehiclePrice: state.price, deposit: dep, term: state.term, balloon: state.balloon, monthly: result.monthly },
            };

            // POST to KenganAuto CRM (public endpoint)
            fetch(CONFIG.apiBase + '/api/leads/widget/' + CONFIG.tenantId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(function () { /* fail silently — lead data still shown */ });

            // Show success
            document.getElementById('ka-form-view').classList.remove('active');
            document.getElementById('ka-success-msg').textContent =
                'Your finance request for ' + fmt(state.price) + ' (est. ' + fmt(result.monthly) + '/month) has been sent. Our team will call you within 30 minutes.';
            document.getElementById('ka-success-view').classList.add('active');
        });

        update();
    }

    /* ── Bootstrap ── */
    injectStyles();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }

})();
