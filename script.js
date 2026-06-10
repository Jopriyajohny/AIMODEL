// Demo: Load a Teachable Machine image model and show webcam predictions
let model, webcam, labelContainer, maxPredictions, rafId;
let running = false;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const modelUrlInput = document.getElementById('model-url');
const statusEl = document.getElementById('status');

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
    webcam = new tmImage.Webcam(320, 240, flip);
    await webcam.setup();
    await webcam.play();

    document.getElementById('webcam-container').innerHTML = '';
    document.getElementById('webcam-container').appendChild(webcam.canvas);

    labelContainer = document.getElementById('label-container');
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
        const row = document.createElement('div');
        row.className = 'label-row';
        const name = document.createElement('div');
        name.style.width = '160px';
        name.textContent = '...';
        const bar = document.createElement('div');
        bar.className = 'bar';
        const inner = document.createElement('i');
        bar.appendChild(inner);
        const prob = document.createElement('div');
        prob.style.width='60px';
        prob.textContent = '';
        row.appendChild(name);
        row.appendChild(bar);
        row.appendChild(prob);
        labelContainer.appendChild(row);
    }

    loop();
}

async function loop() {
    webcam.update();
    await predict();
    rafId = window.requestAnimationFrame(loop);
}

async function predict() {
    if (!model) return;
    const prediction = await model.predict(webcam.canvas);

    // Find top prediction
    let top = {className:'', probability:0};
    for (let i = 0; i < prediction.length; i++) {
        const p = prediction[i];
        const row = labelContainer.childNodes[i];
        row.childNodes[0].textContent = p.className;
        const pct = Math.round(p.probability * 100);
        row.childNodes[1].firstChild.style.width = pct + '%';
        row.childNodes[2].textContent = pct + '%';
        if (p.probability > top.probability) top = p;
    }
    statusEl.textContent = `Running — ${top.className} (${(top.probability*100).toFixed(0)}%)`;
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
