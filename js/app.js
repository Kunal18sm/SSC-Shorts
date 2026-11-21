// Infinite Random SSC Study Shorts Controller

let currentCategory = 'all';
let previousCategory = 'all';
let currentQueueIndex = 0;
let shortQueue = [];
let userSoundEnabled = localStorage.getItem('ssc_sound_enabled') === 'true';
let hasInteracted = false;

// DOM Elements
const shortsFeedEl = document.getElementById('shortsFeed');
const categorySelector = document.getElementById('categorySelector');
const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
const selectedCategoryLabel = document.getElementById('selectedCategoryLabel');
const dropdownItems = document.querySelectorAll('.dropdown-item');
const navSavedBtn = document.getElementById('navSavedBtn');
const prevBtn = document.getElementById('prevShortBtn');
const nextBtn = document.getElementById('nextShortBtn');
const toastEl = document.getElementById('toast');

const categoryDisplayNames = {
  'all': 'All Topics',
  'maths': 'Maths',
  'reasoning': 'Reasoning',
  'english': 'English',
  'gk': 'GK & GS',
  'animals': 'Animals',
  'saved': 'Saved'
};

// Initialize
function initApp() {
  setupEventListeners();
  loadCategory('all');
}

let totalShortsViewed = 0;
let quizCounter = 0;

// Replenish queue infinitely with random shorts + 1 Quiz Batch (3 Qs) every 5 shorts!
function replenishQueue(category) {
  const freshShuffledBatch = ShortsStore.getRandomStream(category);
  if (freshShuffledBatch.length > 0) {
    freshShuffledBatch.forEach(shortItem => {
      shortQueue.push(shortItem);
      totalShortsViewed++;

      // User requirement: "ab hum har 5 video ke baad quize card show karenge 3 quize ka"
      if (typeof QuizEngine !== 'undefined' && category !== 'saved' && totalShortsViewed % QuizEngine.SHORTS_BETWEEN_QUIZ === 0) {
        const batch = QuizEngine.getQuizBatch(quizCounter++);
        if (batch && batch.length > 0) {
          shortQueue.push({
            type: 'quiz_batch',
            id: `batch_${Date.now()}_${quizCounter}`,
            quizBatch: batch
          });
        }
      }
    });
  }
}

// Switch category or reset
function loadCategory(category) {
  if (category !== 'saved') {
    previousCategory = category;
  }
  currentCategory = category;
  currentQueueIndex = 0;

  // Update dropdown label and active state
  if (selectedCategoryLabel && category !== 'saved') {
    selectedCategoryLabel.textContent = categoryDisplayNames[category] || 'Topics';
  }

  dropdownItems.forEach(item => {
    item.classList.toggle('active', item.dataset.category === category);
  });

  // Update Nav Saved Button active state
  if (navSavedBtn) {
    navSavedBtn.classList.toggle('active', category === 'saved');
  }

  if (category === 'saved') {
    renderSavedGridView();
  } else {
    shortQueue = [];
    replenishQueue(category);
    replenishQueue(category); // Runway
    renderActiveShort();
  }
}

// Render Saved Shorts Thumbnail Grid View (YouTube Style)
function renderSavedGridView() {
  const bookmarks = ShortsStore.getBookmarks();
  const allShorts = ShortsStore.getAllShorts();
  const savedItems = allShorts.filter(s => bookmarks.includes(s.id));

  // Hide desktop floating arrows while viewing the grid
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  if (savedItems.length === 0) {
    shortsFeedEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h4>No Saved Shorts</h4>
        <p>Shorts dekhte waqt Bookmark icon dabayein taaki wo yahan show hon.</p>
        <button class="category-dropdown-btn" onclick="loadCategory('all')" style="margin-top:14px; padding: 8px 18px;">Back to Feed</button>
      </div>
    `;
    return;
  }

  shortsFeedEl.innerHTML = `
    <div class="saved-grid-view">
      <div class="saved-grid-header">
        <span class="saved-grid-title">Saved Library</span>
        <span class="saved-grid-count">${savedItems.length} Saved</span>
      </div>
      <div class="saved-grid">
        ${savedItems.map(item => `
          <div class="saved-thumb-card" onclick="playSingleShort('${item.id}')" title="Play Video">
            <img class="saved-thumb-img" src="https://i.ytimg.com/vi/${item.id}/hqdefault.jpg" alt="Thumbnail" loading="lazy">
            <div class="saved-thumb-gradient"></div>
            <span class="saved-thumb-badge">${item.categoryLabel || item.category}</span>
            <button class="saved-thumb-delete" onclick="event.stopPropagation(); removeSavedItem('${item.id}')" title="Remove from Saved">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
            <div class="saved-play-icon">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Play selected saved short from thumbnail click
function playSingleShort(videoId) {
  const bookmarks = ShortsStore.getBookmarks();
  const allShorts = ShortsStore.getAllShorts();
  const savedItems = allShorts.filter(s => bookmarks.includes(s.id));
  if (savedItems.length > 0) {
    shortQueue = savedItems;
    const targetIdx = savedItems.findIndex(s => s.id === videoId);
    currentQueueIndex = targetIdx !== -1 ? targetIdx : 0;
    renderActiveShort();
  }
}

// Remove item from saved grid
function removeSavedItem(videoId) {
  ShortsStore.toggleBookmark(videoId);
  showToast('Removed from Bookmarks');
  renderSavedGridView();
}

// Render the active short
function renderActiveShort() {
  // Restore desktop floating arrows for vertical player
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';

  if (shortQueue.length === 0) {
    if (currentCategory === 'saved') {
      renderSavedGridView();
    } else {
      loadCategory('all');
    }
    return;
  }

  // Ensure index is within bounds
  if (currentQueueIndex < 0) currentQueueIndex = 0;
  if (currentCategory === 'saved' && currentQueueIndex >= shortQueue.length) {
    currentQueueIndex = 0;
  }
  
  // Infinite scroll auto-replenish
  if (currentCategory !== 'saved' && currentQueueIndex >= shortQueue.length - 4) {
    replenishQueue(currentCategory);
  }

  const currentItem = shortQueue[currentQueueIndex];
  if (!currentItem) return;

  // Check if current item is a Quiz Batch or Quiz Card!
  if (currentItem.type === 'quiz_batch' || currentItem.type === 'quiz') {
    const batch = currentItem.quizBatch || [currentItem.quizData];
    renderQuizBatch(batch);
    return;
  }

  const short = currentItem;
  const isBookmarked = ShortsStore.isBookmarked(short.id);

  // Mark as seen so this video is never repeated until all are seen!
  ShortsStore.markAsSeen(short.id);

  const muteParam = userSoundEnabled ? 0 : 1;

  // Pure Clean Video Card - controls=0 for zero controller clutter!
  shortsFeedEl.innerHTML = `
    <div class="short-card">
      ${currentCategory === 'saved' ? `
        <button class="saved-back-btn" id="btnBackToGrid" title="Back to Saved Library">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Saved Grid</span>
        </button>
      ` : ''}

      <!-- 100% Video Player Frame (Header cropped out, controls=0) -->
      <div class="video-wrapper">
        <iframe 
          id="ytPlayer"
          src="https://www.youtube-nocookie.com/embed/${short.id}?autoplay=1&mute=${muteParam}&controls=0&rel=0&loop=1&playlist=${short.id}&playsinline=1&modestbranding=1&enablejsapi=1" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen>
        </iframe>
      </div>

      <!-- Gesture & Wheel Scroll Overlay -->
      <div class="video-gesture-layer" id="gestureLayer" title="Click to Play/Pause • Scroll for Next"></div>

      <!-- Custom Play/Pause Pulse Indicator -->
      <div class="play-pause-pulse" id="playPulse">
        <svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>
      </div>

      <!-- Right Action Column (Vertically Centered - Transparent & Hollow Outline Bookmark) -->
      <div class="right-actions">
        <!-- Bookmark / Save (Hollow Outline: Beech me Khali, Outline White) -->
        <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" id="btnBookmark" title="${isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}">
          <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>

        <!-- Sound Mute/Unmute Toggle Button -->
        <button class="action-btn" id="btnSound" title="${userSoundEnabled ? 'Mute Audio' : 'Unmute Audio'}">
          ${userSoundEnabled ? `
            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          ` : `
            <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          `}
        </button>

        <!-- Random Next Short -->
        <button class="action-btn" id="btnNextRandom" title="Shuffle Random Short">
          <svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
        </button>

        <!-- Direct YouTube Link -->
        <a class="action-btn" href="https://www.youtube.com/shorts/${short.id}" target="_blank" rel="noopener noreferrer" title="Open on YouTube">
          <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
        </a>
      </div>
    </div>
  `;

  // Back to Saved Grid button
  const btnBackToGrid = document.getElementById('btnBackToGrid');
  if (btnBackToGrid) {
    btnBackToGrid.addEventListener('click', (e) => {
      e.stopPropagation();
      renderSavedGridView();
    });
  }

  // Action events
  document.getElementById('btnBookmark').addEventListener('click', () => {
    const isSaved = ShortsStore.toggleBookmark(short.id);
    showToast(isSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
    if (currentCategory === 'saved') {
      const bookmarks = ShortsStore.getBookmarks();
      const allShorts = ShortsStore.getAllShorts();
      const savedItems = allShorts.filter(s => bookmarks.includes(s.id));
      if (savedItems.length === 0) {
        renderSavedGridView();
        return;
      }
      shortQueue = savedItems;
      if (currentQueueIndex >= shortQueue.length) {
        currentQueueIndex = 0;
      }
      renderActiveShort();
    } else {
      renderActiveShort();
    }
  });

  // Sound toggle button click
  const btnSound = document.getElementById('btnSound');
  if (btnSound) {
    btnSound.addEventListener('click', (e) => {
      e.stopPropagation();
      userSoundEnabled = !userSoundEnabled;
      localStorage.setItem('ssc_sound_enabled', userSoundEnabled);
      const player = document.getElementById('ytPlayer');
      if (player && player.contentWindow) {
        player.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: userSoundEnabled ? 'unMute' : 'mute',
          args: ''
        }), '*');
        if (userSoundEnabled) {
          player.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [100]
          }), '*');
        }
      }
      btnSound.title = userSoundEnabled ? 'Mute Audio' : 'Unmute Audio';
      btnSound.innerHTML = userSoundEnabled ? `
        <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
      ` : `
        <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
      `;
      showToast(userSoundEnabled ? 'Sound ON 🔊' : 'Sound Muted 🔇');
    });
  }

  document.getElementById('btnNextRandom').addEventListener('click', () => {
    nextRandomShort();
  });

  // Attach Gesture Layer Events (Click play/pause & double-click save)
  const gestureLayer = document.getElementById('gestureLayer');
  const playPulse = document.getElementById('playPulse');
  let isVideoPlaying = true;
  let clickTimeout = null;

  clearInterval(window._progressTimer);

  if (gestureLayer) {
    gestureLayer.addEventListener('click', () => {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        const player = document.getElementById('ytPlayer');
        if (player && player.contentWindow) {
          isVideoPlaying = !isVideoPlaying;
          player.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: isVideoPlaying ? 'playVideo' : 'pauseVideo',
            args: ''
          }), '*');

          // If playing and sound enabled, reinforce unMute
          if (isVideoPlaying && userSoundEnabled) {
            player.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'unMute',
              args: ''
            }), '*');
          }

          // Subtle pulse icon in center
          if (playPulse) {
            playPulse.innerHTML = isVideoPlaying 
              ? '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="#fff"/></svg>'
              : '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="#fff"/><rect x="14" y="4" width="4" height="16" fill="#fff"/></svg>';
            playPulse.classList.add('show');
            setTimeout(() => playPulse.classList.remove('show'), 350);
          }
        }
      }, 200);
    });

    gestureLayer.addEventListener('dblclick', () => {
      clearTimeout(clickTimeout);
      const isSaved = ShortsStore.toggleBookmark(short.id);
      showToast(isSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
      if (currentCategory === 'saved') {
        const bookmarks = ShortsStore.getBookmarks();
        const allShorts = ShortsStore.getAllShorts();
        const savedItems = allShorts.filter(s => bookmarks.includes(s.id));
        if (savedItems.length === 0) {
          renderSavedGridView();
          return;
        }
        shortQueue = savedItems;
        if (currentQueueIndex >= shortQueue.length) {
          currentQueueIndex = 0;
        }
        renderActiveShort();
      } else {
        renderActiveShort();
      }
    });
  }
}

// Render QuizeApp Native SSC Quiz Batch (3 Qs per batch: 2 MongoDB + 1 Classic)
function renderQuizBatch(batch) {
  // Clear any existing video progress timer
  clearInterval(window._progressTimer);

  if (!batch || batch.length === 0) {
    nextShort();
    return;
  }

  // Ensure batch is array
  const questionsList = Array.isArray(batch) ? batch : [batch];
  const totalQ = questionsList.length;
  let currentBatchIndex = 0;
  let batchScore = 0;

  function renderCurrentBatchQuestion() {
    const q = questionsList[currentBatchIndex];
    if (!q) {
      nextShort();
      return;
    }

    const qNum = currentBatchIndex + 1;
    const isHindi = QuizEngine.isHindiMode;
    const progressPct = Math.round((qNum / totalQ) * 100);

    // Prepare question text and options based on current language mode
    let displayQ = q.question;
    let displayOpts = [...q.options];

    if (isHindi) {
      if (q.question_hi && q.options_hi && q.options_hi.length === q.options.length) {
        displayQ = q.question_hi;
        displayOpts = q.options_hi;
      } else if (QuizEngine.translationCache[q.id]) {
        displayQ = QuizEngine.translationCache[q.id].question;
        displayOpts = QuizEngine.translationCache[q.id].options;
      } else {
        const embedded = QuizEngine.extractEmbeddedHindiQuestion(q);
        if (embedded && /[ऀ-ॿ]/.test(embedded.question)) {
          displayQ = embedded.question;
          displayOpts = embedded.options;
        }
      }
    } else {
      const eng = QuizEngine.extractEmbeddedEnglishQuestion(q);
      if (eng) {
        displayQ = eng.question;
        displayOpts = eng.options;
      }
    }

    const badges = ['A', 'B', 'C', 'D'];
    const fullCategory = q.category || (q.subject ? q.subject.toUpperCase() : 'SSC EXAM');
    const catParts = fullCategory.split(':');
    const drillSubject = catParts.length > 1 ? catParts[1].trim() : fullCategory;
    const drillTitle = `${drillSubject} • Rapid Drill`;
    const categoryTag = fullCategory.toUpperCase();

    const isLastQuestion = (currentBatchIndex === totalQ - 1);
    const nextBtnText = isLastQuestion ? 'Finish & Watch Shorts ➔' : `Next Question (${qNum + 1}/${totalQ}) ➔`;

    shortsFeedEl.innerHTML = `
      <div class="short-card">
        <div class="quiz-card-wrapper" id="quizCardWrapper">
          <div class="quiz-modal-window">
            <!-- Header (Matching Image Exactly) -->
            <div class="web-test-header">
              <button class="btn-test-exit" id="btnQuizExit" title="Exit to Shorts">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Exit Test</span>
              </button>
              <div class="test-header-center">
                <div class="test-header-title" id="webTestHeaderTitle">${drillTitle}</div>
                <div class="test-header-progress" id="webTestHeaderProgress">Question ${qNum} of ${totalQ}</div>
              </div>
              <div class="test-header-right">
                <span class="test-score-pill" id="webTestScorePill">Score: ${batchScore}/${totalQ}</span>
                <button class="btn-test-translate ${isHindi ? 'active-hindi' : ''}" id="btnQuizTranslate">
                  ${isHindi ? 'A / अ English' : 'अ / A Hindi'}
                </button>
              </div>
            </div>

            <!-- Horizontal Progress Bar with Orange Fill -->
            <div class="web-test-progress-bar">
              <div class="web-test-progress-fill" style="width: ${progressPct}%;"></div>
            </div>

            <!-- Active Test Body -->
            <div class="web-test-body" id="webTestBody">
              <div class="web-question-card">
                <span class="question-category-tag">${categoryTag}</span>
                <div class="question-text-content" id="quizQuestionText">${displayQ}</div>
                ${q.diagram ? `<div class="web-question-diagram">${q.diagram}</div>` : ''}
              </div>

              <!-- Options Grid -->
              <div class="web-options-grid" id="quizOptionsGrid">
                ${displayOpts.map((opt, i) => `
                  <button class="web-option-btn" data-index="${i}">
                    <span class="web-option-badge">${badges[i]}</span>
                    <span class="web-option-text">${opt}</span>
                    <span class="web-option-feedback-icon" id="fb_icon_${i}"></span>
                  </button>
                `).join('')}
              </div>

              <!-- Solution & Explanation Box (Slides open on answer) -->
              <div class="web-explanation-box" id="quizExplanationBox">
                <div class="active-explanation-card">
                  <div class="active-exp-header">
                    <span class="active-exp-title">💡 Solution & Short Trick</span>
                    <span class="active-exp-pill">${catParts[0]}</span>
                  </div>
                  <div class="active-exp-content" id="quizExplanationContent">${q.explanation || 'Option ' + badges[q.correctIndex] + ' is the correct answer.'}</div>
                </div>
              </div>
            </div>

            <!-- Active Test Footer Action Bar -->
            <div class="web-test-footer" id="webTestFooter">
              <button class="btn-test-skip" id="btnQuizSkip">${isLastQuestion ? 'Skip & Finish' : 'Skip Question'}</button>
              <button class="btn-test-next" id="btnQuizNext" disabled>${nextBtnText}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach events
    let isAnswered = false;
    const optionButtons = document.querySelectorAll('.web-option-btn');
    const explanationBox = document.getElementById('quizExplanationBox');
    const btnNext = document.getElementById('btnQuizNext');
    const btnSkip = document.getElementById('btnQuizSkip');
    const btnExit = document.getElementById('btnQuizExit');
    const btnTranslate = document.getElementById('btnQuizTranslate');

    // Option Click
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isAnswered) return;
        isAnswered = true;
        const selectedIndex = parseInt(btn.getAttribute('data-index'), 10);
        const isCorrect = (selectedIndex === q.correctIndex);

        if (isCorrect) {
          batchScore++;
          btn.classList.add('opt-correct');
          const icon = btn.querySelector('.web-option-feedback-icon');
          if (icon) icon.textContent = '✓';
          showToast('Correct Answer! 🎯');
        } else {
          btn.classList.add('opt-wrong');
          const wrongIcon = btn.querySelector('.web-option-feedback-icon');
          if (wrongIcon) wrongIcon.textContent = '✕';

          // Highlight correct option in green
          const correctBtn = optionButtons[q.correctIndex];
          if (correctBtn) {
            correctBtn.classList.add('opt-correct');
            const correctIcon = correctBtn.querySelector('.web-option-feedback-icon');
            if (correctIcon) correctIcon.textContent = '✓';
          }
          showToast('Wrong Answer ❌');
        }

        QuizEngine.saveAnswer(q.id, selectedIndex, isCorrect);

        // Update score pill
        const scorePill = document.getElementById('webTestScorePill');
        if (scorePill) scorePill.textContent = `Score: ${batchScore}/${totalQ}`;

        // Disable options
        optionButtons.forEach(b => b.disabled = true);

        // Show solution box
        if (explanationBox) {
          explanationBox.classList.add('show');
          explanationBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Enable Next / Finish button
        if (btnNext) {
          btnNext.removeAttribute('disabled');
          btnNext.classList.add('active');
          btnNext.focus();
        }
      });
    });

    // Next Button Click
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentBatchIndex < totalQ - 1) {
          currentBatchIndex++;
          renderCurrentBatchQuestion();
        } else {
          showToast(`Drill Completed! 🎯 ${batchScore}/${totalQ}`);
          nextShort();
        }
      });
    }

    // Skip Button Click
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        if (currentBatchIndex < totalQ - 1) {
          currentBatchIndex++;
          renderCurrentBatchQuestion();
        } else {
          nextShort();
        }
      });
    }

    // Exit Button Click
    if (btnExit) {
      btnExit.addEventListener('click', () => nextShort());
    }

    // Hindi Translation Toggle Click
    if (btnTranslate) {
      btnTranslate.addEventListener('click', async () => {
        const isHindiNow = QuizEngine.toggleHindi();
        btnTranslate.classList.toggle('active-hindi', isHindiNow);
        btnTranslate.textContent = isHindiNow ? 'A / अ English' : 'अ / A Hindi';

        if (isHindiNow && !QuizEngine.translationCache[q.id] && (!q.question_hi || !q.options_hi)) {
          const embedded = QuizEngine.extractEmbeddedHindiQuestion(q);
          if (embedded && /[ऀ-ॿ]/.test(embedded.question)) {
            QuizEngine.translationCache[q.id] = embedded;
          } else {
            showToast('Translating to Hindi...');
            const trQ = await QuizEngine.fetchGoogleTranslate(q.question);
            const trOpts = await Promise.all((q.options || []).map(o => QuizEngine.fetchGoogleTranslate(o)));
            QuizEngine.translationCache[q.id] = { question: trQ, options: trOpts };
          }
        }

        renderCurrentBatchQuestion();
      });
    }
  }

  renderCurrentBatchQuestion();
}

function renderQuizCard(q) {
  renderQuizBatch([q]);
}

// Next short (Infinite or Saved Playlist)
function nextShort() {
  if (currentCategory === 'saved') {
    if (shortQueue.length <= 1) {
      showToast('No more saved shorts');
      return;
    }
    currentQueueIndex = (currentQueueIndex + 1) % shortQueue.length;
    renderActiveShort();
    return;
  }
  currentQueueIndex++;
  renderActiveShort();
}

// Prev short
function prevShort() {
  if (currentCategory === 'saved') {
    if (shortQueue.length <= 1) {
      showToast('No more saved shorts');
      return;
    }
    currentQueueIndex = (currentQueueIndex - 1 + shortQueue.length) % shortQueue.length;
    renderActiveShort();
    return;
  }
  if (currentQueueIndex > 0) {
    currentQueueIndex--;
    renderActiveShort();
  } else {
    showToast('First short');
  }
}

// Jump to completely new random short
function nextRandomShort() {
  if (currentCategory === 'saved') {
    if (shortQueue.length > 1) {
      let randIdx;
      do {
        randIdx = Math.floor(Math.random() * shortQueue.length);
      } while (randIdx === currentQueueIndex && shortQueue.length > 1);
      currentQueueIndex = randIdx;
      renderActiveShort();
      showToast('Random Saved Short');
    }
    return;
  }
  const jump = Math.floor(Math.random() * 5) + 1;
  currentQueueIndex += jump;
  renderActiveShort();
  showToast('Next Random Short');
}

// Setup Gestures & Events
function setupEventListeners() {
  // Dropdown Category Selector
  if (categoryDropdownBtn && categorySelector) {
    categoryDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      categorySelector.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!categorySelector.contains(e.target)) {
        categorySelector.classList.remove('open');
      }
    });

    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = item.dataset.category;
        categorySelector.classList.remove('open');
        loadCategory(cat);
      });
    });
  }

  // Nav Saved Button (Dedicated toggle)
  if (navSavedBtn) {
    navSavedBtn.addEventListener('click', () => {
      if (currentCategory === 'saved') {
        // If currently viewing a video inside saved mode, return to grid view
        if (!document.querySelector('.saved-grid-view') && !document.querySelector('.empty-state')) {
          renderSavedGridView();
        } else {
          loadCategory(previousCategory || 'all');
        }
      } else {
        loadCategory('saved');
      }
    });
  }

  // Desktop Floating Nav
  if (nextBtn) nextBtn.addEventListener('click', nextShort);
  if (prevBtn) prevBtn.addEventListener('click', prevShort);

  // Keyboard navigation (Arrow keys & Shortcuts)
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextShort();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      prevShort();
    } else if (e.key.toLowerCase() === 'r') {
      nextRandomShort();
    } else if (e.key.toLowerCase() === 'm') {
      const btnSound = document.getElementById('btnSound');
      if (btnSound) btnSound.click();
    } else if (e.key.toLowerCase() === 'k' || e.code === 'Space') {
      e.preventDefault();
      const gesture = document.getElementById('gestureLayer');
      if (gesture) gesture.click();
    } else if (e.key.toLowerCase() === 'b') {
      const short = shortQueue[currentQueueIndex];
      if (short) {
        const state = ShortsStore.toggleBookmark(short.id);
        showToast(state ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
        if (currentCategory === 'saved') {
          const bookmarks = ShortsStore.getBookmarks();
          const allShorts = ShortsStore.getAllShorts();
          const savedItems = allShorts.filter(s => bookmarks.includes(s.id));
          if (savedItems.length === 0) {
            renderSavedGridView();
            return;
          }
          shortQueue = savedItems;
          if (currentQueueIndex >= shortQueue.length) {
            currentQueueIndex = 0;
          }
          renderActiveShort();
        } else {
          renderActiveShort();
        }
      }
    }
  });

  // Mobile Touch Swipe (Swipe Up = Next, Swipe Down = Prev)
  let startY = 0;
  const viewport = document.querySelector('.shorts-viewport');

  viewport.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = startY - endY;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextShort(); // swipe up -> next short
      } else {
        prevShort(); // swipe down -> prev short
      }
    }
  }, { passive: true });

  // Mouse wheel scroll (Attached to window for 100% reliable scrolling)
  let wheelLock = false;
  window.addEventListener('wheel', (e) => {
    // If viewing the saved grid view, allow normal scrolling of thumbnail grid!
    if (document.querySelector('.saved-grid-view') || document.querySelector('.empty-state')) return;
    // On quiz card, allow natural reading/scrolling of explanation and options
    if (document.querySelector('.quiz-card-wrapper')) return;
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 320);

    if (e.deltaY > 15) {
      nextShort();
    } else if (e.deltaY < -15) {
      prevShort();
    }
  }, { passive: true });
}

// Toast
let toastTimer = null;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1600);
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
