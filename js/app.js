// js/app.js
// Purpose: General utilities, query parsing, small UI helpers, and global config.
// (الهدف: دوال مساعدة عامة لقراءة بارامترات العنوان والتنقل والـ UI)
// Note: This file must be loaded first on pages.

const MPN = (function () {
  const config = {
    repoOwner: 'abdallah-7amza',    // default repo owner (عدل إذا لزم)
    repoName: 'MED-Portal-NUB',     // default repo name
    rawBase: 'https://raw.githubusercontent.com/abdallah-7amza/MED-Portal-NUB/main'
  };

  function qs() {
    return new URLSearchParams(location.search);
  }

  function getParam(name, fallback = null) {
    const s = qs().get(name);
    return s !== null ? s : fallback;
  }

  function slugify(text) {
    return String(text).trim().toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function showToast(msg, opts = {}) {
    // simple floating toast at top-right
    const t = document.createElement('div');
    t.className = 'mpn-toast';
    t.style.position = 'fixed';
    t.style.top = '18px';
    t.style.right = '18px';
    t.style.zIndex = 1200;
    t.style.padding = '10px 14px';
    t.style.borderRadius = '10px';
    t.style.background = 'rgba(0,0,0,0.8)';
    t.style.color = 'white';
    t.style.fontWeight = 600;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0.0', 4000);
    setTimeout(() => t.remove(), 5000);
  }

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  // Expose small API
  return {
    config, qs, getParam, slugify, showToast, delay
  };
})();
