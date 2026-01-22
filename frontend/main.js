
const API_BASE = ""; 


const FLIP_X = true;
const NORMALIZE = true;
const MIN_HAND_SCORE = 0.60;
const PREDICT_EVERY_MS = 300;
const VOTE_WINDOW = 7;
const MIN_ACCEPT_CONF = 0.35;


const ALLOWED = new Set(["A","C","D","E","I","L","N","O","P","R","S","V","W"]);


const WORDS = [
  "CASA",
  "CLARO",
  "PODER",
  "PRAIA",
  "PAPEL",
  "PANELA",
  "CARRO",
  "LIVRO",
  "PESSOA",
  "VOCE",
  "DIA",
  "NOITE",
  "SOL",
  "RISOS",
  "VALOR"
];


let videoEl, canvasEl, canvasCtx;
let btnToggle, btnAdd, btnDel, btnSkip;
let letterEl, confidenceEl;
let camStatusEl, backendStatusEl, handStatusEl, debugStatusEl;
let targetWordEl, typedWordEl, suggestedLetterEl;

function $(id){ return document.getElementById(id); }

function setResult(letter, confidence){
  letterEl.textContent = letter ?? "-";
  const pct = (confidence ?? 0) * 100;
  confidenceEl.textContent = `${pct.toFixed(2)}%`;
}

function setBackendStatus(txt){ backendStatusEl.textContent = txt; }
function setHandStatus(txt){ handStatusEl.textContent = txt; }
function setDebug(txt){ debugStatusEl.textContent = `Debug: ${txt}`; }

async function backendHealth(){
  const r = await fetch(`${API_BASE}/health`);
  if(!r.ok) throw new Error(`Health HTTP ${r.status}`);
  return await r.json();
}

async function backendPredict(features){
  const r = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({features})
  });
  if(!r.ok){
    const t = await r.text();
    throw new Error(`Predict HTTP ${r.status}: ${t}`);
  }
  return await r.json();
}

function explainFetchError(err){
  const msg = String(err?.message || err);
  if(msg.includes("Failed to fetch") || msg.includes("NetworkError")){
    return (
      "Não consegui acessar o backend.\n\n" +
      "Se estiver no Render:\n" +
      "- confira se o deploy está 'Live'\n" +
      "- confira os logs\n\n" +
      "Se estiver local:\n" +
      "1) python backend/server.py\n" +
      "2) abra /health\n"
    );
  }
  return msg;
}


function normalizeLandmarks(lms){
  const wrist = lms[0];
  const centered = lms.map(p => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: p.z - wrist.z
  }));

  let maxD = 0;
  for(const p of centered){
    const d = Math.hypot(p.x, p.y);
    if(d > maxD) maxD = d;
  }
  const scale = maxD > 1e-6 ? (1.0 / maxD) : 1.0;

  return centered.map(p => ({
    x: p.x * scale,
    y: p.y * scale,
    z: p.z * scale
  }));
}

function landmarksToFeatures(lms){
  let use = lms;

  if(FLIP_X){
    use = use.map(p => ({ x: 1 - p.x, y: p.y, z: p.z }));
  }

  if(NORMALIZE){
    use = normalizeLandmarks(use);
  }

  const feat = [];
  for(const p of use){
    feat.push(p.x, p.y, p.z);
  }
  return feat; // 63
}


const voteBuffer = [];
function pushVote(letter, confidence){
  voteBuffer.push({letter, confidence});
  while(voteBuffer.length > VOTE_WINDOW) voteBuffer.shift();
}

function getVoted(){
  if(voteBuffer.length === 0) return null;

  const map = new Map();
  for(const v of voteBuffer){
    const w = Math.max(0, Math.min(1, v.confidence || 0));
    map.set(v.letter, (map.get(v.letter) || 0) + w);
  }

  let bestLetter = null;
  let bestScore = -1;
  for(const [k, val] of map.entries()){
    if(val > bestScore){
      bestScore = val;
      bestLetter = k;
    }
  }

  let sum = 0, cnt = 0;
  for(const v of voteBuffer){
    if(v.letter === bestLetter){
      sum += (v.confidence || 0);
      cnt += 1;
    }
  }
  const avgConf = cnt ? (sum / cnt) : 0;
  return {letter: bestLetter, confidence: avgConf};
}


let wordIndex = 0;
let typed = "";

function currentWord(){
  return WORDS[wordIndex % WORDS.length];
}
function expectedLetter(){
  const w = currentWord();
  return w[typed.length] || null;
}
function updateTrainUI(){
  const w = currentWord();
  targetWordEl.textContent = w;
  typedWordEl.textContent = typed.length ? typed : "-";
  const exp = expectedLetter();
  suggestedLetterEl.textContent = exp ? exp : "✓";

  const runningNow = running;
  btnAdd.disabled = !runningNow;
  btnDel.disabled = !runningNow || typed.length === 0;
  btnSkip.disabled = !runningNow;
}

function nextWord(){
  wordIndex += 1;
  typed = "";
  updateTrainUI();
}

function addLetterFromPrediction(){
  const voted = getVoted();
  if(!voted || voted.confidence < MIN_ACCEPT_CONF){
    setDebug("Sem confiança suficiente para adicionar.");
    return;
  }

  let letter = voted.letter;

  if(!ALLOWED.has(letter)){
    setDebug(`Letra "${letter}" fora do conjunto permitido, ignorada.`);
    return;
  }

  const exp = expectedLetter();
  if(!exp){

    nextWord();
    return;
  }

  if(letter !== exp){
    setDebug(`Errado: você tentou ${letter}, esperado ${exp}.`);
    return;
  }

  typed += letter;
  setDebug(`Certo: ${letter}`);

  if(typed === currentWord()){
    setDebug(`Palavra concluída: ${typed} ✅`);
    nextWord();
  } else {
    updateTrainUI();
  }
}

function deleteLastLetter(){
  if(typed.length === 0) return;
  typed = typed.slice(0, -1);
  updateTrainUI();
}


let hands = null;
let camera = null;
let running = false;
let lastPredictTs = 0;
let busyPredict = false;
let lastHandScore = 0;

function drawOverlay(results){
  const w = videoEl.videoWidth || 640;
  const h = videoEl.videoHeight || 480;

  canvasEl.width = w;
  canvasEl.height = h;

  canvasCtx.clearRect(0, 0, w, h);

  if(results.multiHandLandmarks && results.multiHandLandmarks.length > 0){
    for(const landmarks of results.multiHandLandmarks){
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { lineWidth: 3 });
      drawLandmarks(canvasCtx, landmarks, { lineWidth: 2, radius: 3 });
    }
  }
}

async function onResults(results){
  drawOverlay(results);

  const hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

  lastHandScore = 0;
  if(results.multiHandedness && results.multiHandedness.length > 0){
    const c = results.multiHandedness[0]?.score;
    if(typeof c === "number") lastHandScore = c;
  }

  if(!hasHand){
    setHandStatus("Mão: não detectada ❌");
    setDebug("Aguardando mão...");
    return;
  }

  setHandStatus(`Mão: detectada ✅ (score aprox: ${(lastHandScore*100).toFixed(0)}%)`);

  if(!running) return;

  const now = Date.now();
  if(now - lastPredictTs < PREDICT_EVERY_MS) return;

  if(lastHandScore && lastHandScore < MIN_HAND_SCORE){
    setDebug(`Score baixo (${(lastHandScore*100).toFixed(0)}%), não enviando`);
    return;
  }

  if(busyPredict) return;

  const lms = results.multiHandLandmarks[0];
  const features = landmarksToFeatures(lms);

  if(features.length !== 63){
    setDebug(`Features inválidas: ${features.length}`);
    return;
  }

  busyPredict = true;
  lastPredictTs = now;

  try{
    const out = await backendPredict(features);
    const letter = out.letter;
    const conf = out.confidence;

    if(typeof letter !== "string"){
      setDebug("Backend não retornou 'letter' válido");
      return;
    }

    pushVote(letter, conf);

    const voted = getVoted();
    if(voted){
      if(voted.confidence >= MIN_ACCEPT_CONF){
        setResult(voted.letter, voted.confidence);

        const exp = expectedLetter();
        const hint = exp ? `esperado: ${exp}` : "palavra completa";
        setDebug(`OK: ${voted.letter} (avg ${(voted.confidence*100).toFixed(1)}%) • ${hint}`);
      } else {
        setResult("-", voted.confidence);
        setDebug(`Baixa confiança (avg ${(voted.confidence*100).toFixed(1)}%)`);
      }
    }
  }catch(err){
    console.error(err);
    alert(explainFetchError(err));
    running = false;
    btnToggle.textContent = "Iniciar";
    updateTrainUI();
  }finally{
    busyPredict = false;
  }
}

async function startCameraAndPipe(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    videoEl.srcObject = stream;
    camStatusEl.textContent = "Câmera OK ✅";
  }catch(e){
    console.error(e);
    camStatusEl.textContent = "Falha ao acessar câmera ❌";
    alert("Falha ao acessar câmera. Verifique permissões do navegador.");
    throw e;
  }

  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults(onResults);

  camera = new Camera(videoEl, {
    onFrame: async () => {
      if(!hands) return;
      await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480
  });

  camera.start();
}

function toggleRun(){
  running = !running;
  btnToggle.textContent = running ? "Parar" : "Iniciar";
  setDebug(running ? "Rodando predição..." : "Parado.");
  updateTrainUI();
}


async function main(){
  videoEl = $("webcam");
  canvasEl = $("overlay");
  canvasCtx = canvasEl.getContext("2d");

  btnToggle = $("btnToggle");
  btnAdd = $("btnAdd");
  btnDel = $("btnDel");
  btnSkip = $("btnSkip");

  letterEl = $("letter");
  confidenceEl = $("confidence");

  camStatusEl = $("camStatus");
  backendStatusEl = $("backendStatus");
  handStatusEl = $("handStatus");
  debugStatusEl = $("debugStatus");

  targetWordEl = $("targetWord");
  typedWordEl = $("typedWord");
  suggestedLetterEl = $("suggestedLetter");

  setResult("-", 0);
  setHandStatus("Mão: aguardando...");
  setBackendStatus("Backend: verificando...");


  try{
    const h = await backendHealth();
    if(!h.model_loaded){
      setBackendStatus("Backend: OK, mas modelo NÃO carregou ❌ (veja /health)");
      alert("Backend está ON, mas model_loaded=false. Veja /health -> error.");
    } else {
      setBackendStatus(`Backend: OK ✅ (labels: ${h.labels})`);
    }
  }catch(err){
    console.error(err);
    setBackendStatus("Backend: OFF ❌");
    alert(explainFetchError(err));
  }

  updateTrainUI();

  await startCameraAndPipe();

  btnToggle.addEventListener("click", toggleRun);
  btnAdd.addEventListener("click", addLetterFromPrediction);
  btnDel.addEventListener("click", deleteLastLetter);
  btnSkip.addEventListener("click", nextWord);

  setDebug("Pronto. Clique em Iniciar.");
  updateTrainUI();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch(e => console.error(e));
});