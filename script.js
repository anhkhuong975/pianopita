// Staff lines (top → bottom): F5, D5, B4, G4, E4
// y positions in SVG (spacing = 15px, half-step = 7.5px)
const STAFF_LINES_Y = [30, 45, 60, 75, 90];

const NOTES = {
  //         y on SVG    ledger line y (only C4 needs one below the staff)
  'C4': { y: 105, ledgerY: 105 },
  'D4': { y: 97.5 },
  'E4': { y: 90 },   // 1st line
  'F4': { y: 82.5 },
  'G4': { y: 75 },   // 2nd line
  'A4': { y: 67.5 },
  'B4': { y: 60 },   // 3rd line (middle)
  'C5': { y: 52.5 },
  'D5': { y: 45 },   // 4th line
  'E5': { y: 37.5 },
  'F5': { y: 30 },   // 5th line (top)
};

const LANG = document.documentElement.lang.startsWith('en') ? 'en' : 'vi';

const i18n = {
  vi: {
    noteNames:   { C: 'Đô', D: 'Rê', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
    octaveLabel: 'quãng',
    msgCorrect:  'Đúng rồi!',
    msgWrong:    'Sai! Đáp án đúng được tô màu xanh.',
  },
  en: {
    noteNames:   { C: 'C (Do)', D: 'D (Re)', E: 'E (Mi)', F: 'F (Fa)', G: 'G (Sol)', A: 'A (La)', B: 'B (Si)' },
    octaveLabel: 'octave',
    msgCorrect:  'Correct!',
    msgWrong:    'Wrong! The correct key is highlighted in blue.',
  },
};

const T = i18n[LANG];;
const NOTE_X = 220;   // x position of note head in SVG
const SVG_NS = 'http://www.w3.org/2000/svg';

let currentNote = null;
let answered = false;
let scoreCorrect = 0;
let scoreWrong = 0;

// ── Staff drawing ────────────────────────────────────────────────────────────

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function drawStaff(note) {
  const svg = document.getElementById('staff-svg');
  svg.innerHTML = '';

  // 5 staff lines
  for (const y of STAFF_LINES_Y) {
    svg.appendChild(svgEl('line', {
      x1: 55, x2: 368, y1: y, y2: y,
      stroke: '#333', 'stroke-width': 1.5
    }));
  }

  // Treble clef (𝄞 U+1D11E)
  const clef = document.createElementNS(SVG_NS, 'text');
  clef.setAttribute('x', '9');
  clef.setAttribute('y', '96');
  clef.setAttribute('font-size', '84');
  clef.setAttribute('font-family', 'serif');
  clef.setAttribute('fill', '#222');
  clef.textContent = '\u{1D11E}';
  svg.appendChild(clef);

  if (!note) return;

  const nd = NOTES[note];
  const ny = nd.y;

  // Ledger line below staff for C4
  if (nd.ledgerY) {
    svg.appendChild(svgEl('line', {
      x1: NOTE_X - 14, x2: NOTE_X + 14,
      y1: nd.ledgerY, y2: nd.ledgerY,
      stroke: '#333', 'stroke-width': 1.5
    }));
  }

  // Note head: rotated ellipse (standard notation style)
  svg.appendChild(svgEl('ellipse', {
    cx: NOTE_X, cy: ny, rx: 8, ry: 5.5,
    fill: '#111',
    transform: `rotate(-15, ${NOTE_X}, ${ny})`
  }));

  // Stem: up when note is on/below middle line (B4, y=60), down otherwise
  const stemUp = ny >= 60;
  const sx = NOTE_X + (stemUp ? 7 : -7);
  svg.appendChild(svgEl('line', {
    x1: sx, x2: sx,
    y1: ny, y2: ny + (stemUp ? -36 : 36),
    stroke: '#111', 'stroke-width': 1.5
  }));
}

// ── Piano keyboard ───────────────────────────────────────────────────────────

function buildPiano() {
  const piano = document.getElementById('piano');
  const WW = 44;   // white key width
  const BW = 26;   // black key width

  const whites = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  // Whether each white key has a black key immediately to its right
  const hasBlack = [true, true, false, true, true, true, false];

  let wi = 0;
  for (const oct of [4, 5]) {
    for (let i = 0; i < 7; i++) {
      const note = whites[i] + oct;

      // White key
      const wk = document.createElement('div');
      wk.className = 'key white-key';
      wk.style.left = wi * WW + 'px';
      wk.dataset.note = note;
      wk.innerHTML = `<span class="key-label">${whites[i]}${oct}</span>`;
      wk.addEventListener('click', () => handleClick(note));
      piano.appendChild(wk);

      // Black key to the right (centered on the boundary with the next white key)
      if (hasBlack[i]) {
        const bk = document.createElement('div');
        bk.className = 'key black-key';
        bk.style.left = ((wi + 1) * WW - Math.floor(BW / 2)) + 'px';
        piano.appendChild(bk);
      }

      wi++;
    }
  }
  piano.style.width = wi * WW + 'px';
}

// ── Game logic ───────────────────────────────────────────────────────────────

function handleClick(note) {
  if (answered) return;
  answered = true;

  const piano = document.getElementById('piano');
  const clickedKey = piano.querySelector(`[data-note="${note}"]`);
  const correctKey = piano.querySelector(`[data-note="${currentNote}"]`);
  const feedbackEl = document.getElementById('feedback');
  const answerEl = document.getElementById('answer');

  if (note === currentNote) {
    scoreCorrect++;
    clickedKey.classList.add('key-correct');
    feedbackEl.textContent = T.msgCorrect;
    feedbackEl.className = 'feedback msg-correct';
  } else {
    scoreWrong++;
    clickedKey.classList.add('key-wrong');
    correctKey.classList.add('key-show');
    feedbackEl.textContent = T.msgWrong;
    feedbackEl.className = 'feedback msg-wrong';
  }

  const octave = currentNote.slice(1);
  const letter = currentNote[0];
  answerEl.textContent = `${currentNote}  —  ${T.noteNames[letter]} (${T.octaveLabel} ${octave})`;
  answerEl.classList.remove('hidden');

  document.getElementById('score-correct').textContent = scoreCorrect;
  document.getElementById('score-wrong').textContent = scoreWrong;
  document.getElementById('score-total').textContent = scoreCorrect + scoreWrong;
  document.getElementById('next-btn').classList.remove('hidden');
}

function nextQuestion() {
  answered = false;

  // Reset piano highlights
  document.querySelectorAll('.white-key').forEach(k =>
    k.classList.remove('key-correct', 'key-wrong', 'key-show')
  );

  document.getElementById('feedback').textContent = ' ';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('answer').classList.add('hidden');
  document.getElementById('next-btn').classList.add('hidden');

  // Pick a random note, different from the current one
  const pool = Object.keys(NOTES).filter(n => n !== currentNote);
  currentNote = pool[Math.floor(Math.random() * pool.length)];
  drawStaff(currentNote);
}

// ── Responsive piano scaling ─────────────────────────────────────────────────

function scalePiano() {
  const scroll = document.querySelector('.piano-scroll');
  const piano = document.getElementById('piano');
  const pianoWidth = parseFloat(piano.style.width) || 616;
  const available = scroll.offsetWidth;

  if (available > 0 && pianoWidth > available) {
    const scale = available / pianoWidth;
    piano.style.transform = `scale(${scale})`;
    piano.style.transformOrigin = 'top left';
    // Collapse the extra layout space caused by transform not affecting flow
    scroll.style.height = Math.ceil(132 * scale) + 'px';
    scroll.style.overflow = 'hidden';
  } else {
    piano.style.transform = '';
    piano.style.transformOrigin = '';
    scroll.style.height = '';
    scroll.style.overflow = '';
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

buildPiano();
scalePiano();
nextQuestion();

window.addEventListener('resize', scalePiano);
