// Progressive Web App (PWA) Registration and Install Prompt

let deferredPrompt = null;
const installAppBtn = document.getElementById('installAppBtn');

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => {
        console.log('SSC Shorts ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed:', err);
      });
  });
}

// Handle Install Prompt (Add to Home Screen)
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing prompt
  e.preventDefault();
  deferredPrompt = e;
  
  // Show Install Button in Header
  if (installAppBtn) {
    installAppBtn.style.display = 'flex';
  }
});

if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('App is ready! To install, use your browser menu -> "Add to Home Screen".');
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installAppBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  console.log('SSC Shorts PWA installed successfully!');
  showToast('🎉 SSC Shorts App install ho gayi!');
  if (installAppBtn) {
    installAppBtn.style.display = 'none';
  }
});
