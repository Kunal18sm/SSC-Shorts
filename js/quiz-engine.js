// SSC Daily Quiz Engine (Powered by QuizeApp & MongoDB Verified Sets)
// Excludes Math completely; 3 Questions per session: 2 MongoDB Raja/Aditya Sir GK + 1 Classic SSC English/GK

const QuizEngine = {
  DAILY_QUOTA_COUNT: 30,
  SHORTS_BETWEEN_QUIZ: 5, // User requirement: "ab hum har 5 video ke baad quize card show karenge"
  BATCH_SIZE: 3,          // User requirement: "3 quize ka jinme se 2 questions iss mongodb wale quize set se honge and 1 question humare ourane quize set se hoga"
  isHindiMode: false,
  translationCache: {},

  // Get or initialize Today's 30 Questions Quota (Strictly NO Math)
  getTodayQuota() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem('ssc_daily_quiz_date_v3');
    let quota = [];

    try {
      const savedQuota = localStorage.getItem('ssc_daily_quiz_quota_v3');
      if (savedQuota && storedDate === todayStr) {
        quota = JSON.parse(savedQuota);
        const hasMath = quota.some(q => {
          const cat = (q.category || '').toLowerCase();
          const sub = (q.subject || '').toLowerCase();
          return cat.includes('math') || sub === 'math';
        });
        if (Array.isArray(quota) && quota.length > 0 && !hasMath) {
          return quota;
        }
      }
    } catch (e) {
      console.warn('Error reading saved daily quota:', e);
    }

    // Refresh quota for a new day!
    quota = this.generateFreshQuota();
    localStorage.setItem('ssc_daily_quiz_date_v3', todayStr);
    localStorage.setItem('ssc_daily_quiz_quota_v3', JSON.stringify(quota));
    localStorage.setItem('ssc_daily_quiz_progress_v3', JSON.stringify({}));
    return quota;
  },

  // Generate 30 well-balanced questions from window.QUIZEE_ALL_QUESTIONS (NO MATH)
  generateFreshQuota() {
    if (!window.QUIZEE_ALL_QUESTIONS) {
      console.warn('QUIZEE_ALL_QUESTIONS not loaded');
      return [];
    }

    const data = window.QUIZEE_ALL_QUESTIONS;
    const selected = [];

    const distribution = [
      { key: 'english', count: 10 },
      { key: 'static_gk', count: 6 },
      { key: 'polity', count: 4 },
      { key: 'history', count: 4 },
      { key: 'geography', count: 3 },
      { key: 'biology', count: 2 },
      { key: 'economics', count: 1 }
    ];

    distribution.forEach(dist => {
      const list = data[dist.key] || [];
      if (list.length > 0) {
        const nonMathList = list.filter(q => {
          const cat = (q.category || '').toLowerCase();
          const sub = (q.subject || '').toLowerCase();
          return !cat.includes('math') && sub !== 'math';
        });
        const shuffled = [...nonMathList].sort(() => 0.5 - Math.random());
        selected.push(...shuffled.slice(0, dist.count));
      }
    });

    return selected.sort(() => 0.5 - Math.random()).slice(0, this.DAILY_QUOTA_COUNT);
  },

  // Generates 3-Question Batch: 2 from MongoDB Quizzes + 1 from Classic SSC Bank
  getQuizBatch(batchIndex = 0) {
    const batch = [];

    // 1. Pick 2 MongoDB questions (From Raja Sir & Aditya Sir SSC GK GS Sets)
    const mongoPool = window.MONGODB_QUIZ_QUESTIONS || [];
    if (mongoPool.length > 0) {
      let seenMongoIds = [];
      try {
        seenMongoIds = JSON.parse(localStorage.getItem('ssc_mongo_seen_ids') || '[]');
      } catch (e) {
        seenMongoIds = [];
      }

      let availableMongo = mongoPool.filter(q => !seenMongoIds.includes(q.id));
      if (availableMongo.length < 2) {
        seenMongoIds = [];
        availableMongo = [...mongoPool];
        localStorage.setItem('ssc_mongo_seen_ids', JSON.stringify([]));
      }

      // Shuffle & pick 2
      const shuffled = [...availableMongo].sort(() => 0.5 - Math.random());
      const q1 = shuffled[0];
      const q2 = shuffled[1] || shuffled[0];

      seenMongoIds.push(q1.id, q2.id);
      localStorage.setItem('ssc_mongo_seen_ids', JSON.stringify(seenMongoIds.slice(-400)));

      batch.push({ ...q1, source: 'mongodb' });
      batch.push({ ...q2, source: 'mongodb' });
    }

    // 2. Pick 1 Classic question (English or GK from QUIZEE_ALL_QUESTIONS)
    const quota = this.getTodayQuota();
    if (quota && quota.length > 0) {
      const classicQ = quota[batchIndex % quota.length];
      batch.push({ ...classicQ, source: 'classic' });
    }

    // Fallback if needed
    while (batch.length < this.BATCH_SIZE && mongoPool.length > 0) {
      const rnd = mongoPool[Math.floor(Math.random() * mongoPool.length)];
      batch.push({ ...rnd, source: 'mongodb' });
    }

    return batch;
  },

  // Get answer progress for today
  getTodayProgress() {
    try {
      const p = localStorage.getItem('ssc_daily_quiz_progress_v3');
      return p ? JSON.parse(p) : {};
    } catch (e) {
      return {};
    }
  },

  getScore() {
    const progress = this.getTodayProgress();
    let score = 0;
    Object.values(progress).forEach(item => {
      if (item && item.isCorrect) score++;
    });
    return score;
  },

  saveAnswer(questionId, selectedIdx, isCorrect) {
    const progress = this.getTodayProgress();
    progress[questionId] = { selectedIdx, isCorrect, answeredAt: Date.now() };
    localStorage.setItem('ssc_daily_quiz_progress_v3', JSON.stringify(progress));
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
