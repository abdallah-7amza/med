// js/github.js
// Purpose: Discover lessons and fetch lesson/quiz files from GitHub repo.
// (الهدف: اكتشاف الدروس وجلب ملفات الـ Markdown والـ JSON من الريبو)
// Clarification: This uses public GitHub endpoints; unauthenticated rate limit applies (60 req/hour per IP).
// (توضيح: يستخدم نقاط النهاية العامة لـ GitHub لذلك يوجد حد للطلبات دون توثيق.)

const github = (function () {
  const { config } = MPN;
  const cacheTTL = 10 * 60 * 1000; // 10 minutes cache TTL for listing and content (10 دقائق)

  // localStorage cache helpers
  function cacheKey(path) { return `mpn:cache:${path}`; }
  function setCache(path, data) {
    try {
      const payload = { ts: Date.now(), data };
      localStorage.setItem(cacheKey(path), JSON.stringify(payload));
    } catch (e) { /* ignore quota errors */ }
  }
  function getCache(path) {
    try {
      const raw = localStorage.getItem(cacheKey(path));
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p.ts || (Date.now() - p.ts) > cacheTTL) return null;
      return p.data;
    } catch (e) { return null; }
  }

  // Helper to fetch JSON from GitHub API for a path (contents endpoint)
  async function apiListContents(path) {
    // Returns array of objects {name, path, type}
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
    // try cache first
    const cached = getCache(`api:${path}`);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('GitHub API list failed', res.status);
        return null;
      }
      const json = await res.json();
      setCache(`api:${path}`, json);
      return json;
    } catch (e) {
      console.error('apiListContents error', e);
      return null;
    }
  }

  // List lessons in folder e.g., lessons/pediatrics
  async function listLessons(year, specialty) {
    // We'll look in lessons/{specialty}
    const path = `lessons/${specialty}`;
    const list = await apiListContents(path);
    if (!Array.isArray(list)) return []; // fallback to empty
    // each item might be file or directory. We only want .md files at that level.
    const lessons = list.filter(i => i.type === 'file' && i.name.endsWith('.md')).map(f => {
      const title = f.name.replace(/\.md$/, '').replace(/-/g, ' ');
      return {
        title: title.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join(' '),
        slug: f.name.replace(/\.md$/, ''),
        specialty
      };
    });
    // enhance with snippet: attempt to fetch the first 160 chars of the md
    const enhanced = await Promise.all(lessons.map(async (l) => {
      const raw = await getRaw(`lessons/${specialty}/${l.slug}.md`);
      return { ...l, snippet: raw ? raw.slice(0, 160).replace(/\n/g, ' ') : '' };
    }));
    return enhanced;
  }

  // get raw content via raw.githubusercontent.com
  async function getRaw(path) {
    const url = `${config.rawBase}/${path}`;
    const cached = getCache(`raw:${path}`);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      setCache(`raw:${path}`, text);
      return text;
    } catch (e) {
      console.error('getRaw error', e);
      return null;
    }
  }

  // public API
  return {
    listLessons,
    getLessonContent: async (year, specialty, lessonSlug) => {
      const p = `lessons/${specialty}/${lessonSlug}.md`;
      return await getRaw(p);
    },
    getQuiz: async (year, specialty, lessonSlug) => {
      const p = `questions/${specialty}/${lessonSlug}.json`;
      const raw = await getRaw(p);
      if (!raw) return null;
      try {
        const obj = JSON.parse(raw);
        return obj;
      } catch (e) {
        console.warn('quiz JSON parse error', e);
        return null;
      }
    }
  };
})();
