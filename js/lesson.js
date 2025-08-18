// js/lesson.js
// Purpose: Convert markdown to HTML (lightweight renderer) and provide quiz rendering logic.
// (الهدف: تحويل Markdown لعرض HTML وإدارة واجهة الاختبار)
const lessonRenderer = (function () {

  // Basic safe escape
  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Very small markdown renderer (supports headings, bold, italic, links, lists, code blocks)
  function renderMarkdown(md) {
    if (!md) return '';
    // Normalize line endings
    let text = md.replace(/\r\n/g, '\n');

    // code blocks ```lang ... ```
    text = text.replace(/```([\s\S]*?)```/g, function(m) {
      const inner = m.slice(3, -3);
      return `<pre class="code-block">${escapeHtml(inner)}</pre>`;
    });

    // headings
    text = text.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    text = text.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // bold and italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // unordered lists
    text = text.replace(/^\s*[-*] (.*)/gm, '<li>$1</li>');
    text = text.replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*<li>)/g, function(m) {
      // This naive approach groups single list item into ul if preceding li exists.
      return m;
    });
    // group adjacent <li> into <ul>
    text = text.replace(/(<li>[\s\S]*?<\/li>)(\s*<li>[\s\S]*?<\/li>)+/g, function(m) {
      const items = m.match(/<li>[\s\S]*?<\/li>/g).join('');
      return `<ul>${items}</ul>`;
    });

    // paragraphs: split by two newlines
    const parts = text.split(/\n{2,}/g).map(p => p.trim()).filter(Boolean);
    const html = parts.map(p => {
      // if already a block element, keep
      if (/^<\/?(h\d|ul|pre|blockquote|ol)/i.test(p)) return p;
      return `<p>${p}</p>`;
    }).join('\n');

    return html;
  }

  // Render markdown into container selector, optionally extract title / meta
  function renderMarkdownTo(selector, md, opts = {}) {
    const container = document.querySelector(selector);
    if (!container) return;
    container.innerHTML = renderMarkdown(md);
    // If options ask for titleSelector: take first H1 from md
    if (opts.titleSelector) {
      const titleEl = document.querySelector(opts.titleSelector);
      const match = md.match(/^# (.*)$/m);
      const title = match ? match[1] : 'Untitled Lesson';
      titleEl.innerHTML = `<h2>${escapeHtml(title)}</h2><div class="meta">Estimated reading: ~5-12 min</div>`;
    }
    // attach anchors to headings for in-page nav
    const headings = container.querySelectorAll('h1,h2,h3');
    headings.forEach(h => {
      const id = h.textContent.trim().toLowerCase().replace(/[^\w]+/g,'-');
      h.id = id;
    });
  }

  // Quiz rendering
  function renderQuiz(selector, quiz) {
    const cont = document.querySelector(selector);
    if (!cont) return;
    if (!quiz || !Array.isArray(quiz.items) || quiz.items.length === 0) {
      cont.innerHTML = `<div class="empty">No quiz available for this lesson. (لا يوجد اختبار لهذا الدرس)</div>`;
      return;
    }
    // Reset container
    cont.innerHTML = '';
    let correctCount = 0;
    quiz.items.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.innerHTML = `<div class="stem"><strong>Q${idx+1}.</strong> ${q.stem}</div><div class="options" id="opts-${idx}"></div><div class="explanation" id="exp-${idx}" style="display:none;margin-top:8px;color:#444"></div>`;
      cont.appendChild(card);
      const optsContainer = document.getElementById(`opts-${idx}`);
      q.options.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.className = 'option-btn';
        b.textContent = opt;
        b.addEventListener('click', () => {
          // disable all options
          const siblings = optsContainer.querySelectorAll('.option-btn');
          siblings.forEach(s => s.disabled = true);
          // mark correct/wrong
          if (oi === q.answerIndex) {
            b.classList.add('correct');
            correctCount++;
          } else {
            b.classList.add('wrong');
            // highlight correct one
            const right = optsContainer.querySelectorAll('.option-btn')[q.answerIndex];
            if (right) right.classList.add('correct');
          }
          // show explanation if present
          const exp = document.getElementById(`exp-${idx}`);
          if (q.explanation) {
            exp.innerHTML = `<strong>Explanation:</strong> ${q.explanation}`;
            exp.style.display = 'block';
          }
          // update summary
          updateSummary();
        });
        optsContainer.appendChild(b);
      });
    });

    // finish / score UI
    const summary = document.createElement('div');
    summary.className = 'quiz-summary';
    summary.style.marginTop = '12px';
    summary.innerHTML = `<div id="quiz-score">Score: 0 / ${quiz.items.length}</div><div style="margin-top:8px;"><button class="btn" id="retry-quiz">Retry</button></div>`;
    cont.appendChild(summary);

    function updateSummary() {
      const scoreEl = document.getElementById('quiz-score');
      // Recount correct by counting elements with class 'correct' on options per question
      let cnt = 0;
      quiz.items.forEach((q, i) => {
        const opts = document.querySelectorAll(`#opts-${i} .option-btn`);
        opts.forEach((o, oi) => {
          if (o.classList.contains('correct')) {
            // ensure we only count per question once
            cnt++;
          }
        });
      });
      // This naive count doubles counts if multiple correct markers exist; better compute by reading disabled state + correct mark per question
      // We'll compute properly:
      let proper = 0;
      quiz.items.forEach((q, i) => {
        const opts = document.querySelectorAll(`#opts-${i} .option-btn`);
        const anyCorrect = Array.from(opts).some(o => o.classList.contains('correct') && o.disabled === true);
        if (anyCorrect) proper++;
      });
      scoreEl.textContent = `Score: ${proper} / ${quiz.items.length}`;
    }

    // Retry
    document.getElementById('retry-quiz').addEventListener('click', () => {
      renderQuiz(selector, quiz);
    });
  }

  return {
    renderMarkdownTo,
    renderQuiz
  };
})();
