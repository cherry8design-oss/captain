// chat.js 
// Client-side chat logic for /api/chat
// Usage: include as module script after DOM is ready
// Expects DOM elements with IDs: input-field, send-btn, mic-btn, rate, volume, clear, chat-log, bubble, bubble-text

const API_BASE = (window.location && window.location.origin) ? window.location.origin + '/api/chat' : '/api/chat';
const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 9000;
const SPEECH_MAX_CHARS = 1400;

const els = {
  input: document.getElementById('input-field'),
  sendBtn: document.getElementById('send-btn'),
  micBtn: document.getElementById('mic-btn'),
  rate: document.getElementById('rate'),
  volume: document.getElementById('volume'),
  clear: document.getElementById('clear'),
  chatLog: document.getElementById('chat-log'),
  bubble: document.getElementById('bubble'),
  bubbleText: document.getElementById('bubble-text')
};

function safeTextNode(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d;
}

function appendChat(text, cls = 'chat-bot') {
  if (!els.chatLog) return;
  const node = document.createElement('div');
  node.className = 'chat-item ' + cls;
  node.textContent = text;
  els.chatLog.appendChild(node);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function setBubble(text) {
  if (!els.bubble || !els.bubbleText) return;
  els.bubbleText.textContent = text;
  els.bubble.style.display = text ? 'block' : 'none';
}

// fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// send message with retry/backoff
async function postChat(payload) {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    try {
      const res = await fetchWithTimeout(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        const body = await res.text().catch(() => '<no body>');
        throw new Error(`Server ${res.status}: ${body}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('postChat attempt', attempt, err?.message || err);
      attempt++;
      if (attempt > MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

// play speech and sync bubble
function playSpeech(text) {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const utter = new SpeechSynthesisUtterance(String(text).slice(0, SPEECH_MAX_CHARS));
      utter.lang = 'ru-RU';
      utter.rate = parseFloat(els.rate?.value || 1);
      utter.volume = parseFloat(els.volume?.value || 1);
      utter.onstart = () => {
        setBubble(text);
      };
      utter.onend = () => {
        setBubble('');
        resolve();
      };
      utter.onerror = () => {
        setBubble('');
        resolve();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('playSpeech error', e);
      setBubble('');
      resolve();
    }
  });
}

// handle commands array from server
async function handleCommands(commands = []) {
  for (const cmd of commands) {
    if (!cmd || typeof cmd !== 'object') continue;
    const type = String(cmd.type || '').toLowerCase();
    if (type === 'move' && typeof cmd.x === 'number' && typeof cmd.z === 'number') {
      // call global move handler if exists
      if (typeof window.setCharacterTarget === 'function') {
        try { window.setCharacterTarget(cmd.x, cmd.z); } catch (e) { console.warn('move handler failed', e); }
      }
    } else if (type === 'animation' && cmd.name) {
      // call global playAnimation if available
      if (typeof window.playAnimation === 'function') {
        try { window.playAnimation(cmd.name, { loop: !!cmd.loop, fade: cmd.fade || 0.3 }); } catch (e) { console.warn('playAnimation failed', e); }
      }
    } else if (type === 'speech' && cmd.text) {
      try { await playSpeech(cmd.text); } catch (e) { console.warn('speech command failed', e); }
    } else {
      console.warn('Unknown command', cmd);
    }
  }
}

// main send flow
async function sendMessage() {
  if (!els.input) return;
  const text = els.input.value.trim();
  if (!text) return;
  appendChat(text, 'chat-user');
  els.input.value = '';
  setBubble('...');
  try {
    const payload = { message: text, context: { mouseX: (window.mouseObserver && window.mouseObserver.x) || 0 }, userId: (window.USER_ID || 'guest') };
    const data = await postChat(payload);
    // expected fields: speech, baseAnim, choreoOverrides, commands
    const speech = data?.speech || '';
    const baseAnim = data?.baseAnim || '';
    const commands = Array.isArray(data?.commands) ? data.commands : [];

    if (speech) appendChat(speech, 'chat-bot');
    setBubble(speech || '');

    // trigger base animation if provided
    if (baseAnim && typeof window.playAnimation === 'function') {
      try { window.playAnimation(baseAnim, { loop: baseAnim === 'idle', fade: 0.3 }); } catch (e) { console.warn('baseAnim failed', e); }
    }

    // play speech and then run commands that may follow
    await playSpeech(speech || '');
    await handleCommands(commands);
  } catch (err) {
    console.error('sendMessage error', err);
    appendChat('Ошибка сети. Попробуйте ещё раз.', 'chat-bot');
    setBubble('');
  }
}

// attach events
function attachUI() {
  if (els.sendBtn) els.sendBtn.addEventListener('click', sendMessage);
  if (els.input) els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  if (els.clear) els.clear.addEventListener('click', () => { if (els.chatLog) els.chatLog.innerHTML = ''; appendChat('Чат очищен', 'chat-bot'); });
  if (els.micBtn) {
    els.micBtn.addEventListener('click', async () => {
      // simple toggle: if speechSynthesis speaking, cancel; else focus input
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setBubble('');
      } else {
        els.input?.focus();
      }
    });
  }
}

// init
function initChat() {
  attachUI();
  // initial UI message
  appendChat('3D модель загружена', 'chat-bot');
  // expose helper for debugging
  window.chatSendMessage = sendMessage;
  // ensure bubble hidden initially
  setBubble('');
}

// auto init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}

// export for module usage
export { sendMessage, postChat, playSpeech, handleCommands };
