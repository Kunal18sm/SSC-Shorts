// Infinite Random SSC Study Shorts Controller

let currentCategory = 'all';
let currentQueueIndex = 0;
let shortQueue = [];

// DOM Elements
const shortsFeedEl = document.getElementById('shortsFeed');
const categoryChips = document.querySelectorAll('.chip');
const prevBtn = document.getElementById('prevShortBtn');
const nextBtn = document.getElementById('nextShortBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const toastEl = document.getElementById('toast');

// Initialize
function initApp() {
  setupEventListeners();
  loadCategory('all');
}

// Replenish queue infinitely with random shorts
function replenishQueue(category) {
  const freshShuffledBatch = ShortsStore.getRandomStream(category);
  if (freshShuffledBatch.length > 0) {
    shortQueue.push(...freshShuffledBatch);
  }
}

// Switch category or reset
function loadCategory(category) {
  currentCategory = category;
  currentQueueIndex = 0;

  // Update chip active states
  categoryChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });

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
        <svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        <h4>No Saved Shorts</h4>
        <p>Shorts dekhte waqt Bookmark icon dabayein taaki wo yahan show hon.</p>
        <button class="chip active" onclick="loadCategory('all')" style="margin-top:14px; padding: 8px 18px;">Back to Feed</button>
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
  const allShorts = ShortsStore.getAllShorts();
  const target = allShorts.find(s => s.id === videoId);
  if (target) {
    shortQueue = [target, ...allShorts.filter(s => s.id !== videoId)];
    currentQueueIndex = 0;
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
    loadCategory('all');
    return;
  }

  // Ensure index is within bounds
  if (currentQueueIndex < 0) currentQueueIndex = 0;
  
  // Infinite scroll auto-replenish
  if (currentCategory !== 'saved' && currentQueueIndex >= shortQueue.length - 4) {
    replenishQueue(currentCategory);
  }

  const short = shortQueue[currentQueueIndex];
  const isBookmarked = ShortsStore.isBookmarked(short.id);

  // Pure Clean Video Card
  shortsFeedEl.innerHTML = `
    <div class="short-card">
      <!-- 100% Video Player Frame (Header cropped out) -->
      <div class="video-wrapper">
        <iframe 
          id="ytPlayer"
          src="https://www.youtube-nocookie.com/embed/${short.id}?autoplay=1&mute=0&controls=1&rel=0&loop=1&playlist=${short.id}&playsinline=1&modestbranding=1&enablejsapi=1" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen>
        </iframe>
      </div>

      <!-- Gesture & Wheel Scroll Overlay -->
      <div class="video-gesture-layer" id="gestureLayer" title="Click to Play/Pause • Scroll for Next"></div>

      <!-- Right Action Column (Vertically Centered - Transparent & Amber Bookmark) -->
      <div class="right-actions">
        <!-- Bookmark / Save (Gold/Amber icon) -->
        <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" id="btnBookmark" title="${isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}">
          <svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
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

  // Action events
  document.getElementById('btnBookmark').addEventListener('click', () => {
    const isSaved = ShortsStore.toggleBookmark(short.id);
    showToast(isSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
    renderActiveShort();
  });

  document.getElementById('btnNextRandom').addEventListener('click', () => {
    nextRandomShort();
  });

  // Attach Gesture Layer Events (Click play/pause & double-click save)
  const gestureLayer = document.getElementById('gestureLayer');
  let isVideoPlaying = true;
  let clickTimeout = null;

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
        }
      }, 200);
    });

    gestureLayer.addEventListener('dblclick', () => {
      clearTimeout(clickTimeout);
      const isSaved = ShortsStore.toggleBookmark(short.id);
      showToast(isSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
      renderActiveShort();
    });
  }
}

// Next short (Infinite)
function nextShort() {
  if (currentCategory === 'saved') return;
  currentQueueIndex++;
  renderActiveShort();
}

// Prev short
function prevShort() {
  if (currentCategory === 'saved') return;
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
    loadCategory('all');
    return;
  }
  const jump = Math.floor(Math.random() * 5) + 1;
  currentQueueIndex += jump;
  renderActiveShort();
  showToast('Next Random Short');
}

// Setup Gestures & Events
function setupEventListeners() {
  // Category Chips
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      loadCategory(chip.dataset.category);
    });
  });

  // Top Shuffle button
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      loadCategory(currentCategory);
      showToast('Feed Reshuffled');
    });
  }

  // Desktop Floating Nav
  if (nextBtn) nextBtn.addEventListener('click', nextShort);
  if (prevBtn) prevBtn.addEventListener('click', prevShort);

  // Keyboard navigation (Arrow keys & Shortcuts)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextShort();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      prevShort();
    } else if (e.key.toLowerCase() === 'r') {
      nextRandomShort();
    } else if (e.key.toLowerCase() === 'b') {
      const short = shortQueue[currentQueueIndex];
      if (short) {
        const state = ShortsStore.toggleBookmark(short.id);
        showToast(state ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
        renderActiveShort();
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
    if (currentCategory === 'saved') return; // let user scroll thumbnail grid normally
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
