/**
 * KenganAuto Chat Widget — widget.js
 * ═══════════════════════════════════════════════════════════════
 * Self-contained embeddable chat bubble for any dealership website.
 * Just add one line:
 *   <script src="https://cdn.kenganauto.co.za/widget.js" data-tenant="TENANT_ID"></script>
 *
 * Features:
 *  • Zero-dependency pure JS (no React, no jQuery)
 *  • Asynchronous load — never blocks the host page
 *  • Lead capture form (name + phone) before first message
 *  • Typing indicator, smooth scroll, message history
 *  • Photo upload for trade-in
 *  • "Continue on WhatsApp" CTA
 *  • Mobile responsive
 *  • Fully customisable per tenant via backend config
 *
 * Target bundle: < 50kb unminified (actual ~28kb)
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    /* ── Guard: only initialise once ── */
    if (window.__KAWidget) return;
    window.__KAWidget = true;

    /* ── Read config from script tag ── */
    const scriptTag = document.currentScript ||
        document.querySelector('script[data-tenant]');
    const TENANT_ID = scriptTag ? scriptTag.getAttribute('data-tenant') : null;
    if (!TENANT_ID) { console.warn('[KAWidget] Missing data-tenant attribute.'); return; }

    const API_BASE = scriptTag.getAttribute('data-api') ||
        'https://api.kenganauto.co.za';

    /* ────────────────────────────────────────────────────────────
       STATE
       ──────────────────────────────────────────────────────────── */
    let cfg = {
        bubble_color: '#1B2A4A',
        accent_color: '#C9A84C',
        greeting: "Hi! I'm the KenganAuto AI assistant. How can I help you today?",
        dealership_name: 'KenganAuto Motors',
        logo_url: null,
        position: 'bottom-right',
        show_lead_form: true,
        whatsapp_number: null,
        widget_title: 'AI Assistant',
        auto_open_delay: 0,
    };
    let isOpen = false;
    let conversationId = null;
    let leadCaptured = false;
    let leadData = { name: '', phone: '' };
    let isTyping = false;
    let messages = []; // { role, content, timestamp }
    let unread = 0;

    /* ────────────────────────────────────────────────────────────
       CSS INJECTION
       ──────────────────────────────────────────────────────────── */
    function injectStyles() {
        const css = `
#ka-widget-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
#ka-widget-root { position: fixed; z-index: 2147483647; }
#ka-widget-root.ka-pos-br { bottom: 24px; right: 24px; }
#ka-widget-root.ka-pos-bl { bottom: 24px; left: 24px; }

/* Bubble */
#ka-bubble {
  width: 60px; height: 60px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.35);
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease;
  position: relative; border: none; outline: none;
}
#ka-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(0,0,0,0.45); }
#ka-bubble svg { width: 28px; height: 28px; fill: #fff; }
#ka-bubble-badge {
  position: absolute; top: 0; right: 0;
  width: 20px; height: 20px; border-radius: 50%;
  background: #EF4444; color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
  animation: ka-bounce 2s infinite;
}
@keyframes ka-bounce {
  0%,100%{ transform: scale(1); }
  50%{ transform: scale(1.2); }
}

/* Panel */
#ka-panel {
  width: 360px; max-height: 580px;
  display: flex; flex-direction: column;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
  background: #0D1526;
  margin-bottom: 12px;
  transform-origin: bottom right;
  animation: ka-slide-up 0.3s cubic-bezier(0.4,0,0.2,1) both;
}
#ka-widget-root.ka-pos-bl #ka-panel { transform-origin: bottom left; }
@keyframes ka-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
#ka-panel.ka-hidden { display: none; }

/* Header */
#ka-header {
  padding: 16px 18px; display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
}
#ka-header-logo {
  width: 38px; height: 38px; border-radius: 10px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 14px; color: #fff; flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,0.2);
}
#ka-header-logo img { width: 100%; height: 100%; object-fit: cover; }
#ka-header-info { flex: 1; }
#ka-header-title { font-weight: 700; font-size: 14px; color: #fff; line-height: 1.2; }
#ka-header-sub { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; display: flex; align-items: center; gap: 4px; }
#ka-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ADE80; display: inline-block; animation: ka-pulse 2s infinite; }
@keyframes ka-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
#ka-close { background: rgba(255,255,255,0.08); border: none; cursor: pointer; color: rgba(255,255,255,0.5); width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
#ka-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
#ka-close svg { width: 16px; height: 16px; }

/* Messages */
#ka-messages {
  flex: 1; overflow-y: auto; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  scroll-behavior: smooth;
}
#ka-messages::-webkit-scrollbar { width: 4px; }
#ka-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.ka-msg { max-width: 80%; display: flex; flex-direction: column; gap: 3px; }
.ka-msg-bot { align-self: flex-start; }
.ka-msg-user { align-self: flex-end; }

.ka-bubble-text {
  padding: 10px 14px; border-radius: 16px;
  font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
}
.ka-msg-bot .ka-bubble-text {
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9);
  border-bottom-left-radius: 4px;
}
.ka-msg-user .ka-bubble-text {
  color: #0A0F1E; border-bottom-right-radius: 4px; font-weight: 500;
}
.ka-msg-time { font-size: 10px; color: rgba(255,255,255,0.25); }
.ka-msg-user .ka-msg-time { text-align: right; }

/* Typing */
#ka-typing { display: flex; align-items: center; gap: 5px; padding: 10px 14px; }
#ka-typing span {
  width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.3);
  animation: ka-typing-dot 1.4s infinite;
}
#ka-typing span:nth-child(2){ animation-delay: 0.2s; }
#ka-typing span:nth-child(3){ animation-delay: 0.4s; }
@keyframes ka-typing-dot {
  0%,80%,100%{ transform: scale(0.8); opacity:0.4; }
  40%{ transform: scale(1.1); opacity:1; }
}
.ka-typing-wrap { background: rgba(255,255,255,0.07); border-radius: 16px; border-bottom-left-radius: 4px; align-self: flex-start; }

/* Lead Form */
#ka-lead-form {
  padding: 16px; background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
#ka-lead-form p { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 10px; line-height: 1.4; }
.ka-lead-input {
  width: 100%; padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; font-size: 13px; outline: none; transition: border-color 0.2s;
  margin-bottom: 8px;
}
.ka-lead-input::placeholder { color: rgba(255,255,255,0.3); }
.ka-lead-input:focus { border-color: rgba(201,168,76,0.5); }
.ka-lead-row { display: flex; gap: 8px; }
.ka-lead-row .ka-lead-input { margin-bottom: 0; }
#ka-lead-submit {
  width: 100%; margin-top: 8px; padding: 10px; border-radius: 10px;
  border: none; cursor: pointer; font-weight: 700; font-size: 13px;
  transition: opacity 0.2s, transform 0.15s; color: #0A0F1E;
}
#ka-lead-submit:hover { opacity: 0.9; transform: translateY(-1px); }
#ka-lead-skip { width: 100%; background: none; border: none; cursor: pointer; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 6px; padding: 4px; }
#ka-lead-skip:hover { color: rgba(255,255,255,0.5); }

/* Input Bar */
#ka-input-bar {
  padding: 12px 14px; display: flex; align-items: flex-end; gap: 8px;
  background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
#ka-text-input {
  flex: 1; padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; font-size: 13px; outline: none; resize: none;
  max-height: 100px; line-height: 1.5; transition: border-color 0.2s;
}
#ka-text-input::placeholder { color: rgba(255,255,255,0.3); }
#ka-text-input:focus { border-color: rgba(201,168,76,0.4); }
#ka-send-btn, #ka-upload-btn {
  width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all 0.2s;
}
#ka-send-btn { color: #0A0F1E; }
#ka-send-btn:hover { transform: scale(1.05); }
#ka-send-btn svg, #ka-upload-btn svg { width: 18px; height: 18px; }
#ka-upload-btn { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
#ka-upload-btn:hover { background: rgba(255,255,255,0.13); color: #fff; }
#ka-file-input { display: none; }

/* WhatsApp CTA */
#ka-wa-cta {
  margin: 10px 16px; padding: 12px 14px; border-radius: 12px;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2);
  transition: all 0.2s; text-decoration: none;
}
#ka-wa-cta:hover { background: rgba(37,211,102,0.15); }
#ka-wa-cta svg { width: 22px; height: 22px; fill: #25D366; flex-shrink: 0; }
#ka-wa-cta-text { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.3; }
#ka-wa-cta-text strong { color: #25D366; display: block; font-size: 13px; }

/* Image preview in messages */
.ka-msg-img { max-width: 200px; border-radius: 10px; margin-top: 4px; display: block; }

/* Mobile */
@media (max-width: 480px) {
  #ka-panel { width: calc(100vw - 16px); max-height: 75vh; }
  #ka-widget-root.ka-pos-br { bottom: 12px; right: 8px; }
  #ka-widget-root.ka-pos-bl { bottom: 12px; left: 8px; }
}
`;
        const style = document.createElement('style');
        style.id = 'ka-widget-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ────────────────────────────────────────────────────────────
       DOM CONSTRUCTION
       ──────────────────────────────────────────────────────────── */
    let rootEl, bubbleEl, panelEl, messagesEl, inputEl, sendBtn, uploadInput;
    let leadFormEl, leadNameInput, leadPhoneInput;
    let waCta;

    function buildDOM() {
        rootEl = document.createElement('div');
        rootEl.id = 'ka-widget-root';
        rootEl.className = 'ka-pos-' + (cfg.position === 'bottom-left' ? 'bl' : 'br');

        /* ── Panel ── */
        panelEl = document.createElement('div');
        panelEl.id = 'ka-panel';
        panelEl.className = 'ka-hidden';
        panelEl.innerHTML = `
      <div id="ka-header">
        <div id="ka-header-logo"></div>
        <div id="ka-header-info">
          <div id="ka-header-title"></div>
          <div id="ka-header-sub"><span id="ka-online-dot"></span> Online · AI-powered</div>
        </div>
        <button id="ka-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="ka-messages"></div>
      <div id="ka-lead-form" class="ka-hidden"></div>
      <div id="ka-wa-cta-wrap"></div>
      <div id="ka-input-bar">
        <button id="ka-upload-btn" aria-label="Upload photo" title="Upload photo (trade-in)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </button>
        <textarea id="ka-text-input" placeholder="Type a message…" rows="1"></textarea>
        <button id="ka-send-btn" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
        <input type="file" id="ka-file-input" accept="image/*" />
      </div>`;

        /* ── Bubble ── */
        bubbleEl = document.createElement('button');
        bubbleEl.id = 'ka-bubble';
        bubbleEl.setAttribute('aria-label', 'Open chat');
        bubbleEl.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>`;

        rootEl.appendChild(panelEl);
        rootEl.appendChild(bubbleEl);
        document.body.appendChild(rootEl);

        /* Grab refs */
        messagesEl = document.getElementById('ka-messages');
        inputEl = document.getElementById('ka-text-input');
        sendBtn = document.getElementById('ka-send-btn');
        uploadInput = document.getElementById('ka-file-input');
        leadFormEl = document.getElementById('ka-lead-form');

        applyTheme();
        buildLeadForm();
        bindEvents();
    }

    function applyTheme() {
        bubbleEl.style.background = cfg.bubble_color;

        /* Header */
        const hdr = document.getElementById('ka-header');
        hdr.style.background = `linear-gradient(135deg, ${cfg.bubble_color} 0%, ${darken(cfg.bubble_color, 20)} 100%)`;

        /* Logo area */
        const logoEl = document.getElementById('ka-header-logo');
        if (cfg.logo_url) {
            logoEl.innerHTML = `<img src="${escHtml(cfg.logo_url)}" alt="logo"/>`;
        } else {
            const initials = cfg.dealership_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            logoEl.textContent = initials;
            logoEl.style.background = cfg.accent_color;
            logoEl.style.color = '#0A0F1E';
        }

        document.getElementById('ka-header-title').textContent = cfg.widget_title;

        /* Send button */
        sendBtn.style.background = cfg.accent_color;

        /* Lead form button */
        const submitBtn = document.getElementById('ka-lead-submit');
        if (submitBtn) submitBtn.style.background = cfg.accent_color;
    }

    function buildLeadForm() {
        if (!cfg.show_lead_form) return;
        leadFormEl.innerHTML = `
      <p>Share your details to get personalised help — we'll never spam you.</p>
      <div class="ka-lead-row">
        <input id="ka-lead-name" class="ka-lead-input" placeholder="Your name" />
        <input id="ka-lead-phone" class="ka-lead-input" placeholder="Phone (optional)" type="tel" />
      </div>
      <button id="ka-lead-submit">Start chatting →</button>
      <button id="ka-lead-skip">Skip for now</button>`;

        leadNameInput = document.getElementById('ka-lead-name');
        leadPhoneInput = document.getElementById('ka-lead-phone');

        document.getElementById('ka-lead-submit').addEventListener('click', submitLeadForm);
        document.getElementById('ka-lead-submit').style.background = cfg.accent_color;
        document.getElementById('ka-lead-skip').addEventListener('click', skipLeadForm);
    }

    /* ────────────────────────────────────────────────────────────
       EVENTS
       ──────────────────────────────────────────────────────────── */
    function bindEvents() {
        bubbleEl.addEventListener('click', togglePanel);
        document.getElementById('ka-close').addEventListener('click', closePanel);

        sendBtn.addEventListener('click', handleSend);
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        });
        inputEl.addEventListener('input', autoResize);

        document.getElementById('ka-upload-btn').addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', handleFileUpload);
    }

    function autoResize() {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    }

    /* ────────────────────────────────────────────────────────────
       PANEL OPEN / CLOSE
       ──────────────────────────────────────────────────────────── */
    function togglePanel() {
        isOpen ? closePanel() : openPanel();
    }

    function openPanel() {
        isOpen = true;
        unread = 0;
        updateBadge();
        panelEl.classList.remove('ka-hidden');
        bubbleEl.setAttribute('aria-label', 'Close chat');

        if (messages.length === 0) {
            /* Show greeting message */
            appendMessage('bot', cfg.greeting);
            if (cfg.show_lead_form && !leadCaptured) {
                leadFormEl.classList.remove('ka-hidden');
            }
        }

        setTimeout(() => inputEl.focus(), 300);

        if (cfg.auto_open_delay > 0) {
            clearTimeout(window.__kaAutoOpen);
        }
    }

    function closePanel() {
        isOpen = false;
        panelEl.classList.add('ka-hidden');
        bubbleEl.setAttribute('aria-label', 'Open chat');
    }

    /* ────────────────────────────────────────────────────────────
       LEAD FORM
       ──────────────────────────────────────────────────────────── */
    function submitLeadForm() {
        leadData.name = (leadNameInput?.value || '').trim();
        leadData.phone = (leadPhoneInput?.value || '').trim();
        if (leadData.name) {
            appendMessage('bot', `Nice to meet you, ${leadData.name}! 😊 How can I help you today?`);
        }
        finishLeadCapture();
    }

    function skipLeadForm() {
        finishLeadCapture();
    }

    function finishLeadCapture() {
        leadCaptured = true;
        leadFormEl.classList.add('ka-hidden');
        inputEl.focus();
    }

    /* ────────────────────────────────────────────────────────────
       MESSAGING
       ──────────────────────────────────────────────────────────── */
    async function handleSend() {
        if (!leadCaptured && cfg.show_lead_form) {
            submitLeadForm();
            return;
        }

        const text = inputEl.value.trim();
        if (!text || isTyping) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';
        appendMessage('user', text);
        showTyping(true);

        try {
            const resp = await fetch(`${API_BASE}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                    tenant_id: TENANT_ID,
                    channel: 'website_widget',
                    external_user_id: leadData.phone || leadData.name || 'anon_widget',
                    lead_name: leadData.name || undefined,
                    lead_phone: leadData.phone || undefined,
                }),
            });

            showTyping(false);

            if (!resp.ok) throw new Error('API error ' + resp.status);
            const data = await resp.json();
            conversationId = data.conversation_id;

            appendMessage('bot', data.message);

            /* Show WhatsApp CTA after 2 bot messages */
            if (cfg.whatsapp_number && messages.filter(m => m.role === 'bot').length >= 2) {
                renderWhatsAppCTA();
            }

        } catch {
            showTyping(false);
            appendMessage('bot', "Sorry, I'm having trouble connecting. Please try again in a moment.");
        }
    }

    function appendMessage(role, content) {
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messages.push({ role, content, timestamp: ts });

        const wrap = document.createElement('div');
        wrap.className = `ka-msg ka-msg-${role === 'user' ? 'user' : 'bot'}`;
        wrap.innerHTML = `
      <div class="ka-bubble-text">${escHtml(content).replace(/\n/g, '<br>')}</div>
      <div class="ka-msg-time">${ts}</div>`;

        if (role === 'user') {
            wrap.querySelector('.ka-bubble-text').style.background = cfg.accent_color;
        }

        messagesEl.appendChild(wrap);
        scrollBottom();

        if (!isOpen && role === 'bot') {
            unread++;
            updateBadge();
        }
    }

    function showTyping(show) {
        isTyping = show;
        let existing = messagesEl.querySelector('.ka-typing-wrap');
        if (show) {
            if (existing) return;
            const wrap = document.createElement('div');
            wrap.className = 'ka-msg ka-msg-bot ka-typing-wrap';
            wrap.innerHTML = `<div id="ka-typing"><span></span><span></span><span></span></div>`;
            messagesEl.appendChild(wrap);
            scrollBottom();
        } else {
            if (existing) existing.remove();
        }
    }

    function scrollBottom() {
        requestAnimationFrame(() => {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        });
    }

    function updateBadge() {
        let badge = document.getElementById('ka-bubble-badge');
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'ka-bubble-badge';
                bubbleEl.appendChild(badge);
            }
            badge.textContent = unread;
        } else {
            if (badge) badge.remove();
        }
    }

    /* ────────────────────────────────────────────────────────────
       PHOTO UPLOAD (Trade-In)
       ──────────────────────────────────────────────────────────── */
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        /* Show preview in chat */
        const wrap = document.createElement('div');
        wrap.className = 'ka-msg ka-msg-user';
        wrap.innerHTML = `
      <img src="${url}" class="ka-msg-img" alt="Uploaded photo"/>
      <div class="ka-bubble-text" style="background:${cfg.accent_color};color:#0A0F1E;">📷 Trade-in photo sent</div>
      <div class="ka-msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
        messagesEl.appendChild(wrap);
        scrollBottom();
        uploadInput.value = '';

        /* Trigger AI response about the photo */
        setTimeout(() => {
            appendMessage('bot', "Thanks for the photo! 📸 Our team will review your trade-in vehicle. Could you also tell me the make, model, year and current mileage? That helps us give you an accurate estimate.");
        }, 800);
    }

    /* ────────────────────────────────────────────────────────────
       WHATSAPP CTA
       ──────────────────────────────────────────────────────────── */
    function renderWhatsAppCTA() {
        const wrap = document.getElementById('ka-wa-cta-wrap');
        if (wrap.innerHTML || !cfg.whatsapp_number) return;
        const phone = cfg.whatsapp_number.replace(/\D/g, '');
        const text = encodeURIComponent(`Hi ${cfg.dealership_name}, I was just chatting with your AI assistant online and would like to continue here. My name is ${leadData.name || 'a customer'}.`);
        wrap.innerHTML = `
      <a id="ka-wa-cta" href="https://wa.me/${phone}?text=${text}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <div id="ka-wa-cta-text"><strong>Continue on WhatsApp</strong>Chat with a real consultant</div>
      </a>`;
    }

    /* ────────────────────────────────────────────────────────────
       UTILITIES
       ──────────────────────────────────────────────────────────── */
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function darken(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0xff) - amount);
        const b = Math.max(0, (num & 0xff) - amount);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    /* ────────────────────────────────────────────────────────────
       INITIALISE
       ──────────────────────────────────────────────────────────── */
    async function init() {
        /* Fetch config from backend */
        try {
            const resp = await fetch(`${API_BASE}/api/widget/config/${TENANT_ID}`);
            if (resp.ok) {
                const remote = await resp.json();
                cfg = Object.assign(cfg, remote);
            }
        } catch {
            /* Use defaults if fetch fails */
        }

        injectStyles();
        buildDOM();

        /* Auto-open after delay if configured */
        if (cfg.auto_open_delay > 0) {
            window.__kaAutoOpen = setTimeout(openPanel, cfg.auto_open_delay * 1000);
        }
    }

    /* ── Defer until DOM is ready ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
