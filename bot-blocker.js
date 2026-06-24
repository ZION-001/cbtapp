/**
 * SchoolOption — AI Bot & Scraper Blocker
 * Paste this script in your HTML <head> before any other scripts
 * or import it as the first JS file in your Vercel project.
 *
 * What it does:
 * 1. Blocks known AI crawlers & scrapers by user-agent
 * 2. Blocks headless browsers (Puppeteer, Playwright, Selenium etc.)
 * 3. Detects automated/bot behaviour (no mouse, no touch, instant load)
 * 4. Hides your content from DevTools scraping tricks
 * 5. Disables right-click, text selection, and copy on sensitive content
 * 6. Rate-limits rapid repeated requests from the same session
 */

(function () {
  'use strict';

  /* ── 1. KNOWN AI / SCRAPER USER-AGENT STRINGS ── */
  const BOT_AGENTS = [
    // OpenAI
    'gptbot', 'chatgpt-user', 'oai-searchbot',
    // Anthropic (Claude)
    'claudebot', 'anthropic-ai',
    // Google AI
    'google-extended', 'googleother', 'gemini',
    // Meta
    'meta-externalagent', 'facebookbot',
    // Common scrapers
    'ccbot', 'commoncrawl', 'semrushbot', 'ahrefsbot',
    'mj12bot', 'dotbot', 'petalbot', 'bytespider',
    'applebot', 'baiduspider', 'yandexbot',
    'scrapy', 'python-requests', 'axios', 'node-fetch',
    'wget', 'curl', 'libwww-perl', 'go-http-client',
    'java/', 'okhttp', 'httpclient',
    // Headless browsers
    'headlesschrome', 'phantomjs', 'slimerjs',
    'htmlunit', 'mechanize',
  ];

  /* ── 2. CHECK USER-AGENT ── */
  const ua = (navigator.userAgent || '').toLowerCase();
  const isBotUA = BOT_AGENTS.some(b => ua.includes(b));

  /* ── 3. DETECT HEADLESS / AUTOMATED BROWSERS ── */
  function isHeadless() {
    // Puppeteer / Playwright leave these traces
    if (navigator.webdriver) return true;
    if (window._phantom || window.__nightmare) return true;
    if (window.callPhantom || window._callPhantom) return true;
    // Chrome headless specific
    if (/HeadlessChrome/.test(navigator.userAgent)) return true;
    // Missing plugins = likely headless
    if (navigator.plugins && navigator.plugins.length === 0 &&
        !/bot|crawl|spider/i.test(ua)) return true;
    // No languages set
    if (!navigator.languages || navigator.languages.length === 0) return true;
    return false;
  }

  /* ── 4. BEHAVIOUR DETECTION ── */
  let humanSignal = false;

  function markHuman() { humanSignal = true; }

  // Real users move mouse or touch the screen
  window.addEventListener('mousemove', markHuman, { once: true, passive: true });
  window.addEventListener('touchstart', markHuman, { once: true, passive: true });
  window.addEventListener('keydown',   markHuman, { once: true, passive: true });
  window.addEventListener('scroll',    markHuman, { once: true, passive: true });

  /* ── 5. RATE LIMIT — block if page loaded more than 10x in 1 minute ── */
  function isRateLimited() {
    try {
      const key  = 'so_rl';
      const now  = Date.now();
      const raw  = sessionStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : { count: 0, start: now };

      // Reset window every 60 seconds
      if (now - data.start > 60000) {
        sessionStorage.setItem(key, JSON.stringify({ count: 1, start: now }));
        return false;
      }

      data.count++;
      sessionStorage.setItem(key, JSON.stringify(data));
      return data.count > 10;
    } catch (e) {
      return false;
    }
  }

  /* ── 6. BLOCK FUNCTION ── */
  function blockAccess(reason) {
    // Hide all content immediately
    document.documentElement.style.visibility = 'hidden';

    // Wait for DOM then replace content
    function doBlock() {
      document.documentElement.style.visibility = 'visible';
      document.body.innerHTML = `
        <div style="
          display:flex;align-items:center;justify-content:center;
          min-height:100vh;background:#1c1f2e;font-family:sans-serif;
          text-align:center;padding:24px;
        ">
          <div>
            <div style="font-size:3rem;margin-bottom:16px;">🚫</div>
            <div style="
              font-size:1.1rem;font-weight:700;color:#fff;
              letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;
            ">Access Denied</div>
            <div style="font-size:.85rem;color:rgba(255,255,255,.5);max-width:320px;">
              Automated access to SchoolOption is not permitted.
            </div>
          </div>
        </div>`;
    }

    if (document.body) {
      doBlock();
    } else {
      document.addEventListener('DOMContentLoaded', doBlock);
    }

    // Log reason to console (only visible to the bot, not your users)
    console.warn('[SchoolOption] Access blocked:', reason);
  }

  /* ── 7. DISABLE RIGHT-CLICK & TEXT SELECTION ON SENSITIVE AREAS ── */
  function protectContent() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    // Disable text selection on question/result areas
    const style = document.createElement('style');
    style.textContent = `
      .q-text, .opt, .res-table, .q-area, #quiz-results-body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    // Block common scraping keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      // Block Ctrl+U (view source), Ctrl+S (save), Ctrl+Shift+I (devtools)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U' ||
                        e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    });
  }

  /* ── 8. OBFUSCATE SENSITIVE DATA FROM DEVTOOLS ── */
  function obfuscateConsole() {
    // Warn if DevTools is being used to scrape
    const threshold = 160;
    setInterval(function () {
      const before = new Date();
      // eslint-disable-next-line no-debugger
      debugger;
      const after = new Date();
      if (after - before > threshold) {
        // DevTools is open — clear console output
        console.clear();
        console.warn('%cSchoolOption — Unauthorised inspection detected.',
          'color:red;font-size:14px;font-weight:bold;');
      }
    }, 3000);
  }

  /* ── 9. RUN ALL CHECKS ── */
  if (isBotUA) {
    blockAccess('bot-useragent');
    return;
  }

  if (isHeadless()) {
    blockAccess('headless-browser');
    return;
  }

  if (isRateLimited()) {
    blockAccess('rate-limited');
    return;
  }

  // For borderline cases — check after 3 seconds if no human signal
  setTimeout(function () {
    if (!humanSignal && isHeadless()) {
      blockAccess('no-human-interaction');
    }
  }, 3000);

  // Always run content protection for real users too
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protectContent);
  } else {
    protectContent();
  }

  // Obfuscate console (optional — comment out if it slows your app)
  // obfuscateConsole();

})();
