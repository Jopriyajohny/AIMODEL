// Modern demo logic with statistics and badges
let model, webcam, labelContainer, maxPredictions, rafId;
let running = false;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const modelUrlInput = document.getElementById('model-url');
const statusEl = document.getElementById('status');
const focusPercentEl = document.getElementById('focus-percent');
const distractedPercentEl = document.getElementById('distracted-percent');
const awayPercentEl = document.getElementById('away-percent');
const focusBar = document.getElementById('focus-bar');
const distractedBar = document.getElementById('distracted-bar');
const awayBar = document.getElementById('away-bar');

let counts = {Focused:0, Distracted:0, Away:0, total:0};

startBtn.addEventListener('click', () => startDemo(modelUrlInput.value.trim()));
stopBtn.addEventListener('click', stopDemo);

async function startDemo(url){
  if (running) return;
  statusEl.textContent = 'Loading model...';
  startBtn.disabled = true;
  try{
    await init(url);
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = 'Running';
  }catch(err){
    console.error(err);
    statusEl.textContent = 'Error loading model';
    startBtn.disabled = false;
  }
}

async function init(URL) {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(480, 360, flip);
    await webcam.setup();
    await webcam.play();

    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.innerHTML = '';
    webcam.canvas.className = 'w-100';
    webcamContainer.appendChild(webcam.canvas);

    labelContainer = document.getElementById('label-container');
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
        const row = document.createElement('div');
        row.className = 'label-row';
        const left = document.createElement('div');
        left.className = 'd-flex align-items-center gap-3';
        const name = document.createElement('div');
        name.style.minWidth = '110px';
        name.textContent = '...';
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary';
        badge.textContent = '';
        left.appendChild(name);
        left.appendChild(badge);

        const prog = document.createElement('div');
        prog.style.width = '40%';
        const progressWrap = document.createElement('div');
        progressWrap.className = 'progress progress-sm bg-soft';
        const progBar = document.createElement('div');
        progBar.className = 'progress-bar';
        progBar.style.width = '0%';
        progressWrap.appendChild(progBar);
        prog.appendChild(progressWrap);

        const percent = document.createElement('div');
        percent.style.minWidth = '48px';
        percent.className = 'text-end small';
        percent.textContent = '--%';

        row.appendChild(left);
        row.appendChild(prog);
        row.appendChild(percent);
        labelContainer.appendChild(row);
    }

    // reset stats
    counts = {Focused:0, Distracted:0, Away:0, total:0};
    updateStatsUI();

    loop();
}

async function loop() {
    webcam.update();
    await predict();
    rafId = window.requestAnimationFrame(loop);
}

function normalizeLabel(label){
  const l = label.toLowerCase();
  if (l.includes('focus') || l.includes('focused') || l.includes('attention')) return 'Focused';
  if (l.includes('distract') || l.includes('phone') || l.includes('looking away') || l.includes('distracted')) return 'Distracted';
  if (l.includes('away') || l.includes('not') || l.includes('absent')) return 'Away';
  return label; // fallback: return original
}

async function predict() {
    if (!model) return;
    const prediction = await model.predict(webcam.canvas);

    let top = {className:'', probability:0};
    for (let i = 0; i < prediction.length; i++) {
        const p = prediction[i];
        const row = labelContainer.childNodes[i];
        const name = row.childNodes[0].childNodes[0];
        const badge = row.childNodes[0].childNodes[1];
        const progBar = row.childNodes[1].firstChild.firstChild;
        const percent = row.childNodes[2];

        name.textContent = p.className;
        const normalized = normalizeLabel(p.className);
        // set badge color based on normalized
        badge.textContent = normalized;
        badge.className = 'badge ' + (normalized === 'Focused' ? 'bg-success' : (normalized === 'Distracted' ? 'bg-warning' : (normalized === 'Away' ? 'bg-danger' : 'bg-secondary')));

        const pct = Math.round(p.probability * 100);
        progBar.style.width = pct + '%';
        percent.textContent = pct + '%';

        if (p.probability > top.probability) top = p;
    }

    // tally top prediction category
    const normalizedTop = normalizeLabel(top.className || '');
    if (normalizedTop === 'Focused' || normalizedTop === 'Distracted' || normalizedTop === 'Away'){
      counts[normalizedTop] = (counts[normalizedTop] || 0) + 1;
      counts.total += 1;
    }

    updateStatsUI();
    statusEl.textContent = `Running — ${top.className} ${(top.probability*100).toFixed(0)}%`;
}

function updateStatsUI(){
  const total = counts.total || 1;
  const focusPct = Math.round((counts.Focused || 0)/total*100);
  const distPct = Math.round((counts.Distracted || 0)/total*100);
  const awayPct = Math.round((counts.Away || 0)/total*100);

  focusPercentEl.textContent = focusPct + '%';
  distractedPercentEl.textContent = distPct + '%';
  awayPercentEl.textContent = awayPct + '%';

  focusBar.style.width = focusPct + '%';
  distractedBar.style.width = distPct + '%';
  awayBar.style.width = awayPct + '%';
}

function stopDemo(){
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (webcam) {
    try{ webcam.stop(); }catch(e){}
    const container = document.getElementById('webcam-container');
    container.innerHTML = '';
  }
  model = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = 'Stopped';
}
