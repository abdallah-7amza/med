// js/ai.js
// Purpose: Contextual AI Tutor (floating button, chat overlay) with first-run API key capture and local caching.
// (الهدف: مساعد ذكي عائم يطلب المفتاح لأول مرة ويخزنه محلياً)
// Clarification: API keys live only in user's browser localStorage; this code never sends keys to our server.
// (توضيح: المفاتيح تبقى فقط في متصفح المستخدم ولا تُرسل لسيرفر خارجي من جانبنا)

(function () {
  // Elements
  const fab = document.getElementById('ai-tutor-fab');
  const overlay = document.getElementById('chat-overlay');
  const chatWindow = document.getElementById('chat-window');
  const chatMessages = document.getElementById('chat-messages');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const closeChatBtn = document.getElementById('close-chat-btn');
  const resetKeyBtn = document.getElementById('reset-ai-key');

  // Key storage key
  const STORAGE_KEY = 'mpn:ai:credentials'; // stores { provider, key, model }

  // Ensure UI buttons exist (in case this file loaded on non-lesson pages)
  if (!fab) return;

  // attach events
  fab.addEventListener('click', openChat);
  closeChatBtn.addEventListener('click', closeChat);
  resetKeyBtn.addEventListener('click', resetKey);
  chatInputForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    pushUserMessage(text);
    chatInput.value = '';
    // send to provider
    sendToProvider(text);
  });

  // helper: get credentials
  function getCredentials() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function setCredentials(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function resetKey() {
    localStorage.removeItem(STORAGE_KEY);
    MPN.showToast('AI key removed. You will be prompted next time. (تم حذف المفتاح)');
    closeChat();
  }

  // Build modal to request API key (first-run)
  function askForKey() {
    return new Promise((resolve) => {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.inset = '0';
      wrapper.style.zIndex = 2000;
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.background = 'rgba(0,0,0,0.6)';

      const box = document.createElement('div');
      box.style.width = '520px';
      box.style.maxWidth = '94%';
      box.style.background = '#fff';
      box.style.padding = '18px';
      box.style.borderRadius = '12px';
      box.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';

      box.innerHTML = `
        <h3>Enter your AI API credentials</h3>
        <p>Provide an API key for a provider. The key is stored locally in your browser only. (المفتاح يخزن محلياً فقط)</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <label style="flex:1;">
            Provider
            <select id="ai-provider" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </label>
          <label style="flex:1;">
            Model
            <input id="ai-model" placeholder="gpt-4o-mini or gemini-1.5" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;" />
          </label>
        </div>
        <label style="display:block;margin-top:10px;">
          API Key
          <input id="ai-key" type="password" placeholder="sk-..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;" />
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
          <button id="ai-cancel" class="btn small">Cancel</button>
          <button id="ai-save" class="btn small">Save & Test</button>
        </div>
        <div id="ai-test-status" style="margin-top:10px;color:#444;"></div>
      `;
      wrapper.appendChild(box);
      document.body.appendChild(wrapper);

      document.getElementById('ai-cancel').addEventListener('click', () => {
        wrapper.remove();
        resolve(null);
      });
      document.getElementById('ai-save').addEventListener('click', async () => {
        const provider = document.getElementById('ai-provider').value;
        const model = document.getElementById('ai-model').value.trim();
        const key = document.getElementById('ai-key').value.trim();
        const status = document.getElementById('ai-test-status');
        if (!key) {
          status.textContent = 'Please provide a key. (يرجى إدخال المفتاح)';
          return;
        }
        status.textContent = 'Testing key... (جارِ اختبار المفتاح)';
        // quick validation call depending on provider
        try {
          const ok = await testKey(provider, key, model);
          if (!ok) {
            status.textContent = 'Key test failed. Please check the key and provider. (فشل اختبار المفتاح)';
            return;
          }
          setCredentials({ provider, key, model });
          status.textContent = 'Key saved. (تم الحفظ)';
          await MPN.delay(600);
          wrapper.remove();
          resolve({ provider, key, model });
        } catch (e) {
          status.textContent = 'Error validating key. (خطأ أثناء التحقق)';
          console.error(e);
        }
      });
    });
  }

  // The testKey function attempts a small request that costs minimal tokens.
  // For OpenAI we call model list or a small chat completion; for Gemini we call the /generate endpoint quickly.
  async function testKey(provider, key, model) {
    try {
      if (provider === 'openai') {
        // small sanity call: create chat completion with a short prompt
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'Say OK' }, { role: 'user', content: 'ping' }],
            max_tokens: 3, temperature: 0
          })
        });
        return res.ok;
      } else if (provider === 'gemini') {
        // Google generative API test (this is a placeholder - user must ensure correct endpoint & CORS)
        // We'll try a minimal fetch to the models list (this may need server proxy in real production).
        const testUrl = 'https://generativelanguage.googleapis.com/v1/models:generateText?key=' + encodeURIComponent(key);
        // We send a small generate request
        const body = {
          model: model || 'gemini-1.5',
          prompt: { text: "ping" },
          maxOutputTokens: 1
        };
        const res = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        return res.ok;
      } else {
        return false;
      }
    } catch (e) {
      console.warn('testKey error', e);
      return false;
    }
  }

  // Chat helpers
  function openChat() {
    const creds = getCredentials();
    if (!creds) {
      // show modal to ask for key
      askForKey().then((_c) => {
        if (!_c) {
          MPN.showToast('AI Tutor canceled. (تم الإلغاء)');
          return;
        }
        // after saving, open overlay
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden','false');
        pushSystemWelcome();
      });
      return;
    }
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden','false');
    pushSystemWelcome();
  }

  function closeChat() {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden','true');
  }

  function pushUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'chat-message user';
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function pushAiMessage(text) {
    const el = document.createElement('div');
    el.className = 'chat-message ai';
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function pushSystemWelcome() {
    pushAiMessage('Hello — I am your AI Tutor. I have the current lesson context. Ask me anything about this lesson. (أنا هنا لمساعدتك على فهم الدرس)');
  }

  // Build the system context from page lesson content
  function buildContext() {
    // include lesson title and short snippet if available
    const title = document.querySelector('#lesson-meta h2') ? document.querySelector('#lesson-meta h2').textContent : '';
    const contentEl = document.getElementById('lesson-content');
    const text = contentEl ? contentEl.innerText : '';
    // limit size to first 2000 chars
    const snippet = text.slice(0, 2000);
    return `Lesson: ${title}\n\n${snippet}`;
  }

  // send to provider (adapter)
  async function sendToProvider(userText) {
    const creds = getCredentials();
    if (!creds) {
      pushAiMessage('No AI credentials found. (لا يوجد مفتاح للمساعد الذكي)');
      return;
    }
    // show typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-message ai';
    typing.textContent = '...';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const context = buildContext();
    const prompt = `You are an expert medical tutor. Use the lesson context below to answer the student's question. Be concise and explain clinical reasoning.\n\nContext:\n${context}\n\nStudent question: ${userText}`;

    try {
      let responseText = '';
      if (creds.provider === 'openai') responseText = await callOpenAI(creds.key, creds.model || 'gpt-4o-mini', prompt);
      else if (creds.provider === 'gemini') responseText = await callGemini(creds.key, creds.model || 'gemini-1.5', prompt);
      else responseText = 'Provider not supported. (المزود غير مدعوم)';
      typing.remove();
      pushAiMessage(responseText);
    } catch (e) {
      console.error('sendToProvider error', e);
      typing.remove();
      pushAiMessage('Error contacting AI provider. (خطأ في الاتصال بالمزود)');
    }
  }

  // OpenAI adapter (chat completion)
  async function callOpenAI(key, model, promptText) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful medical tutor.' },
          { role: 'user', content: promptText }
        ],
        temperature: 0.2,
        max_tokens: 700
      })
    });
    if (!res.ok) {
      throw new Error('OpenAI request failed: ' + res.status);
    }
    const j = await res.json();
    const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return content || 'No response from AI.';
  }

  // Gemini adapter (Google generative) — simplified example
  async function callGemini(key, model, promptText) {
    // NOTE: Google GenAI API may require different request shape and API key usage.
    // This is a basic example and may need adaptation per provider doc.
    const url = 'https://generativelanguage.googleapis.com/v1beta2/models/' + encodeURIComponent(model) + ':generateText?key=' + encodeURIComponent(key);
    const body = { prompt: { text: promptText }, maxOutputTokens: 700, temperature: 0.2 };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Gemini request failed: ' + res.status);
    const j = await res.json();
    if (j.candidates && j.candidates[0] && j.candidates[0].content) return j.candidates[0].content;
    if (j.output && j.output[0] && j.output[0].content && j.output[0].content[0] && j.output[0].content[0].text) {
      return j.output[0].content[0].text;
    }
    return 'No response from AI.';
  }
})();
