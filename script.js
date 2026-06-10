// Premium AI Dashboard JavaScript
// Handles demo functionality, animations, and interactions

let model, webcam, labelContainer, maxPredictions, rafId;
let running = false;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const modelUrlInput = document.getElementById('model-url');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const focusPercentEl = document.getElementById('focus-percent');
const distractedPercentEl = document.getElementById('distracted-percent');
const awayPercentEl = document.getElementById('away-percent');
const focusBar = document.getElementById('focus-bar');
const distractedBar = document.getElementById('distracted-bar');
const awayBar = document.getElementById('away-bar');
const scrollTopBtn = document.getElementById('scroll-top-btn');

let counts = { Focused: 0, Distracted: 0, Away: 0, total: 0 };

// ===== Event Listeners =====
startBtn.addEventListener('click', () => startDemo(modelUrlInput.value.trim()));
stopBtn.addEventListener('click', stopDemo);

// Scroll to Top Button
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    scrollTopBtn.classList.add('show');
  } else {
    scrollTopBtn.classList.remove('show');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Smooth scrolling for navbar links
document.querySelectorAll('.smooth-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ===== Demo Functions =====
function scrollToDemo() {
  const demoSection = document.getElementById('demo');
  demoSection.scrollIntoView({ behavior: 'smooth' });
}

async function startDemo(url) {
  if (running) return;
  statusText.textContent = 'Loading model...';
  startBtn.disabled = true;

  try {
    await init(url);
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusBadge.textContent = 'Running';
    statusBadge.className = 'badge bg-success';
    statusText.textContent = 'Detection running...';
  } catch (err) {
    console.error(err);
    statusText.textContent = 'Error loading model. Check URL.';
    statusBadge.textContent = 'Error';
    statusBadge.className = 'badge bg-danger';
    startBtn.disabled = false;
  }
}

async function init(URL) {
  const modelURL = URL + 'model.json';
  const metadataURL = URL + 'metadata.json';

  try {
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(480, 360, flip);
    await webcam.setup();
    await webcam.play();

    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.innerHTML = '';
    webcam.canvas.style.maxWidth = '100%';
    webcam.canvas.style.height = 'auto';
    webcamContainer.appendChild(webcam.canvas);

    labelContainer = document.getElementById('label-container');
    labelContainer.innerHTML = '';

    for (let i = 0; i < maxPredictions; i++) {
      const row = document.createElement('div');
      row.className = 'label-row';

      const left = document.createElement('div');
      left.style.flex = '1';

      const name = document.createElement('div');
      name.style.fontSize = '13px';
      name.textContent = '...';

      const badge = document.createElement('span');
      badge.className = 'badge bg-secondary ms-2';
      badge.textContent = '';

      left.appendChild(name);
      left.appendChild(badge);

      const prog = document.createElement('div');
      prog.style.width = '30%';
      const progressWrap = document.createElement('div');
      progressWrap.className = 'progress progress-premium';
      progressWrap.style.height = '6px';
      const progBar = document.createElement('div');
      progBar.className = 'progress-bar';
      progBar.style.width = '0%';
      progressWrap.appendChild(progBar);
      prog.appendChild(progressWrap);

      const percent = document.createElement('div');
      percent.style.minWidth = '45px';
      percent.style.fontSize = '12px';
      percent.style.fontWeight = '600';
      percent.textContent = '--%';

      row.appendChild(left);
      row.appendChild(prog);
      row.appendChild(percent);
      labelContainer.appendChild(row);
    }

    // Reset stats
    counts = { Focused: 0, Distracted: 0, Away: 0, total: 0 };
    updateStatsUI();

    loop();
  } catch (error) {
    throw error;
  }
}

async function loop() {
  webcam.update();
  await predict();
  rafId = window.requestAnimationFrame(loop);
}

function normalizeLabel(label) {
  const l = label.toLowerCase();
  if (l.includes('focus') || l.includes('attention') || l.includes('concentrated')) {
    return 'Focused';
  }
  if (l.includes('distract') || l.includes('phone') || l.includes('looking away') || l.includes('side')) {
    return 'Distracted';
  }
  if (l.includes('away') || l.includes('not') || l.includes('absent') || l.includes('no face')) {
    return 'Away';
  }
  return label;
}

async function predict() {
  if (!model) return;
  const prediction = await model.predict(webcam.canvas);

  let top = { className: '', probability: 0 };

  for (let i = 0; i < prediction.length; i++) {
    const p = prediction[i];
    const row = labelContainer.childNodes[i];

    const nameEl = row.childNodes[0].childNodes[0];
    const badgeEl = row.childNodes[0].childNodes[1];
    const progBar = row.childNodes[1].firstChild.firstChild;
    const percentEl = row.childNodes[2];

    nameEl.textContent = p.className;

    const normalized = normalizeLabel(p.className);
    badgeEl.textContent = normalized;

    // Set badge color
    if (normalized === 'Focused') {
      badgeEl.className = 'badge bg-success ms-2';
      if (progBar.parentElement) {
        progBar.className = 'progress-bar bg-success';
      }
    } else if (normalized === 'Distracted') {
      badgeEl.className = 'badge bg-warning ms-2';
      if (progBar.parentElement) {
        progBar.className = 'progress-bar bg-warning';
      }
    } else if (normalized === 'Away') {
      badgeEl.className = 'badge bg-danger ms-2';
      if (progBar.parentElement) {
        progBar.className = 'progress-bar bg-danger';
      }
    } else {
      badgeEl.className = 'badge bg-secondary ms-2';
    }

    const pct = Math.round(p.probability * 100);
    progBar.style.width = pct + '%';
    percentEl.textContent = pct + '%';

    if (p.probability > top.probability) {
      top = p;
    }
  }

  // Track statistics
  const normalizedTop = normalizeLabel(top.className || '');
  if (['Focused', 'Distracted', 'Away'].includes(normalizedTop)) {
    counts[normalizedTop] = (counts[normalizedTop] || 0) + 1;
    counts.total += 1;
  }

  updateStatsUI();
  const topPct = (top.probability * 100).toFixed(0);
  statusText.textContent = `Detecting: ${top.className} - ${topPct}% confidence`;
}

function updateStatsUI() {
  const total = Math.max(counts.total, 1);
  const focusPct = Math.round(((counts.Focused || 0) / total) * 100);
  const distPct = Math.round(((counts.Distracted || 0) / total) * 100);
  const awayPct = Math.round(((counts.Away || 0) / total) * 100);

  animateCounter(focusPercentEl, focusPct);
  animateCounter(distractedPercentEl, distPct);
  animateCounter(awayPercentEl, awayPct);

  focusBar.style.width = focusPct + '%';
  distractedBar.style.width = distPct + '%';
  awayBar.style.width = awayPct + '%';
}

function animateCounter(element, targetValue) {
  const currentValue = parseInt(element.textContent) || 0;
  if (currentValue === targetValue) return;

  const diff = targetValue - currentValue;
  const steps = 20;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const newValue = Math.round(currentValue + (diff * step) / steps);
    element.textContent = newValue + '%';

    if (step >= steps) {
      clearInterval(interval);
      element.textContent = targetValue + '%';
    }
  }, 30);
}

function stopDemo() {
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (webcam) {
    try {
      webcam.stop();
    } catch (e) {}
    const container = document.getElementById('webcam-container');
    container.innerHTML = '';
  }
  model = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusBadge.textContent = 'Idle';
  statusBadge.className = 'badge bg-secondary';
  statusText.textContent = 'Ready to start';
}

// ===== Page Animations =====
// Intersection Observer for scroll reveal animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .stat-card-premium, .tech-card, .timeline-step').forEach((el) => {
  observer.observe(el);
});

// ===== Counter Animation on Scroll =====
let countersAnimated = false;

window.addEventListener('scroll', () => {
  if (!countersAnimated) {
    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) {
      const rect = analyticsSection.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        animateAllCounters();
        countersAnimated = true;
      }
    }
  }
});

function animateAllCounters() {
  // This will be called when demo is running
  // counters already animated in updateStatsUI
}

// ===== Initialize on page load =====
document.addEventListener('DOMContentLoaded', () => {
  // Add fade-in animations to hero content
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.style.animation = 'fadeInUp 0.8s ease-out';
  }

  // Smooth color transition for nav on scroll
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar-premium');
    if (window.pageYOffset > 50) {
      navbar.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
    } else {
      navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
    }
  });
});
