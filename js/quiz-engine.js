// SSC Daily Quiz Engine (Powered by QuizeApp 8,700+ Question Bank)

const QuizEngine = {
  DAILY_QUOTA_COUNT: 30,
  SHORTS_BETWEEN_QUIZ: 7, // User requirement: "har 7 shorts ke baad aana chaiye"
  isHindiMode: false,
  translationCache: {},

  // Get or initialize Today's 30 Questions Quota
  getTodayQuota() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem('ssc_daily_quiz_date');
    let quota = [];

    try {
      const savedQuota = localStorage.getItem('ssc_daily_quiz_quota');
      if (savedQuota && storedDate === todayStr) {
        quota = JSON.parse(savedQuota);
        if (Array.isArray(quota) && quota.length > 0) {
          return quota;
        }
      }
    } catch (e) {
      console.warn('Error reading saved daily quota:', e);
    }

    // Refresh quota for a new day!
    quota = this.generateFreshQuota();
    localStorage.setItem('ssc_daily_quiz_date', todayStr);
    localStorage.setItem('ssc_daily_quiz_quota', JSON.stringify(quota));
    localStorage.setItem('ssc_daily_quiz_progress', JSON.stringify({}));
    return quota;
  },

  // Generate 30 well-balanced questions from window.QUIZEE_ALL_QUESTIONS
  generateFreshQuota() {
    if (!window.QUIZEE_ALL_QUESTIONS) {
      console.warn('QUIZEE_ALL_QUESTIONS not loaded');
      return [];
    }

    const data = window.QUIZEE_ALL_QUESTIONS;
    const selected = [];

    // Distribution across subjects for rich diversity:
    // English: 7, Math: 7, Polity: 4, History: 4, Static GK: 4, Geography: 2, Biology: 2 = 30 total
    const distribution = [
      { key: 'english', count: 7 },
      { key: 'math', count: 7 },
      { key: 'polity', count: 4 },
      { key: 'history', count: 4 },
      { key: 'static_gk', count: 4 },
      { key: 'geography', count: 2 },
      { key: 'biology', count: 2 }
    ];

    distribution.forEach(dist => {
      const list = data[dist.key] || [];
      if (list.length > 0) {
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        selected.push(...shuffled.slice(0, dist.count));
      }
    });

    // Shuffle the final 30 questions
    return selected.sort(() => 0.5 - Math.random()).slice(0, this.DAILY_QUOTA_COUNT);
  },

  // Get answer progress for today
  getTodayProgress() {
    try {
      const p = localStorage.getItem('ssc_daily_quiz_progress');
      return p ? JSON.parse(p) : {};
    } catch (e) {
      return {};
    }
  },

  saveAnswer(questionId, selectedIdx, isCorrect) {
    const progress = this.getTodayProgress();
    progress[questionId] = { selectedIdx, isCorrect, answeredAt: Date.now() };
    localStorage.setItem('ssc_daily_quiz_progress', JSON.stringify(progress));
  },

  // Pick question matching active category, or next in daily 30 quota
  getNextQuizQuestion(category = 'all', quizNumber = 0) {
    const quota = this.getTodayQuota();
    if (!quota || quota.length === 0) return null;

    // If specific category selected, prefer matching subject
    if (category !== 'all' && category !== 'animals') {
      const catMap = {
        'maths': ['math'],
        'reasoning': ['math'], // Math tricks / reasoning
        'english': ['english'],
        'gk': ['polity', 'history', 'static_gk', 'geography', 'biology', 'economics']
      };
      const allowedKeys = catMap[category] || [];
      const matchingFromQuota = quota.filter(q => {
        if (!q.category) return false;
        const catLower = q.category.toLowerCase();
        const subLower = (q.subject || '').toLowerCase();
        return allowedKeys.some(k => catLower.includes(k) || subLower.includes(k));
      });
      if (matchingFromQuota.length > 0) {
        return matchingFromQuota[quizNumber % matchingFromQuota.length];
      }
    }

    // Default: cycle through today's 30 questions
    return quota[quizNumber % quota.length];
  },

  // Toggle Hindi Mode
  toggleHindi() {
    this.isHindiMode = !this.isHindiMode;
    return this.isHindiMode;
  },

  // Translation helpers (Exact logic from QuizeApp)
  extractEmbeddedHindiQuestion(q) {
    if (!q || !q.question) return null;
    let hiQ = q.question;
    const qParts = q.question.split('/');
    if (qParts.length > 1 && /[ऀ-ॿ]/.test(qParts[1])) {
      hiQ = qParts[1].trim();
    }
    const hiOpts = (q.options || []).map(opt => {
      const parts = opt.split('/');
      if (parts.length > 1 && /[ऀ-ॿ]/.test(parts[1])) {
        return parts[1].trim();
      }
      return opt;
    });
    return { question: hiQ, options: hiOpts };
  },

  extractEmbeddedEnglishQuestion(q) {
    if (!q || !q.question) return null;
    let engQ = q.question;
    const qParts = q.question.split('/');
    if (qParts.length > 1 && /[ऀ-ॿ]/.test(qParts[1]) && /[a-zA-Z]/.test(qParts[0])) {
      engQ = qParts[0].trim();
    }
    const engOpts = (q.options || []).map(opt => {
      const parts = opt.split('/');
      if (parts.length > 1 && /[ऀ-ॿ]/.test(parts[1]) && /[a-zA-Z0-9]/.test(parts[0])) {
        return parts[0].trim();
      }
      return opt;
    });
    return { question: engQ, options: engOpts };
  },

  async fetchGoogleTranslate(text) {
    if (!text) return '';
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          return data[0].map(s => s[0]).join('');
        }
      }
    } catch (e) {
      console.warn('Translate error:', e);
    }
    return text;
  }
};

window.QuizEngine = QuizEngine;
