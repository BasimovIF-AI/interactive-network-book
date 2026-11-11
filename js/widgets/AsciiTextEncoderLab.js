/**
 * AsciiTextEncoderLab.js — Живой шифратор текста в байты ASCII и UTF-8,
 * фокус «Магия 5-го бита (A ↔ a)» и симулятор кодировок («Кракозябры Windows-1251»).
 */

import { BitMath } from '../engine/BitMath.js';
import { sounds } from '../audio/SoundManager.js';

export class AsciiTextEncoderLab {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.text = 'Привет! 🚀';
    this.brokenEncoding = false;
    this.bit5LetterCode = 65; // 'A'
    this.bit5Active = false;  // false = 'A' (65), true = 'a' (97)
    this.encoder = new TextEncoder();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🔡</span>
            <span class="lab-title">Лаборатория кодировок: ASCII, UTF-8 и Секрет 5-го бита</span>
          </div>
          <span class="lab-badge">Текст → Биты</span>
        </div>
        <div class="lab-body">
          <!-- Блок 1: Живой разбор текста -->
          <div style="margin-bottom: 14px;">
            <label for="ascii-text-input" style="font-weight: 700; display: block; margin-bottom: 6px;">
              1. Введи любое слово, цифру или смайлик (до 18 символов):
            </label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <input type="text" id="ascii-text-input" maxlength="18" class="ascii-input" autocomplete="off">
              <button class="topo-btn" data-preset="Hi!">Hi! (ASCII)</button>
              <button class="topo-btn" data-preset="5 + 5">5 + 5 (Цифра vs число)</button>
              <button class="topo-btn" data-preset="Привет! 🚀">Привет! 🚀 (UTF-8)</button>
            </div>
          </div>

          <div class="ascii-summary-bar" id="ascii-summary-bar"></div>

          <!-- Карточки каждого символа -->
          <div class="ascii-cards-grid" id="ascii-cards-grid"></div>

          <!-- Переключатель симулятора кракозябр -->
          <div class="mojibake-box">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <strong>👾 Симулятор поломки кодировки («Кракозябры из 2000-х»)</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  Посмотри, что увидит программа на экране, если прочтёт те же байты UTF-8 по старой русской таблице <code>Windows-1251</code>:
                </div>
              </div>
              <button class="topo-btn" id="btn-toggle-mojibake">Сломать кодировку (Win-1251)</button>
            </div>
            <div class="mojibake-screen" id="mojibake-screen"></div>
          </div>

          <!-- Блок 2: Магия 5-го бита -->
          <div class="bit5-magic-box">
            <div style="font-weight: 700; margin-bottom: 8px;">
              ✨ Фокус инженеров: Магия 5-го бита (вес 32)
            </div>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
              Чтобы превратить заглавную английскую букву в строчную, компьютер НЕ запоминает новый алфавит — он просто щёлкает один-единственный бит №5 (+32)!
            </p>
            <div class="bit5-stage" id="bit5-stage"></div>
          </div>
        </div>
      </div>
    `;

    const input = this.container.querySelector('#ascii-text-input');
    input.value = this.text;

    input.addEventListener('input', (e) => {
      this.text = e.target.value;
      this.updateTextAnalysis();
    });

    this.container.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.text = btn.dataset.preset;
        input.value = this.text;
        this.updateTextAnalysis();
      });
    });

    this.container.querySelector('#btn-toggle-mojibake').addEventListener('click', () => {
      this.brokenEncoding = !this.brokenEncoding;
      this.brokenEncoding ? sounds.error() : sounds.packetArrive();
      this.updateMojibakeUI();
    });

    this.updateTextAnalysis();
    this.updateBit5UI();
  }

  updateTextAnalysis() {
    const grid = this.container.querySelector('#ascii-cards-grid');
    const summary = this.container.querySelector('#ascii-summary-bar');
    const chars = Array.from(this.text); // Корректно делит суррогатные пары вроде 🚀
    const allBytes = this.encoder.encode(this.text);

    summary.innerHTML = '';
    const sumLeft = document.createElement('span');
    sumLeft.innerHTML = `Символов: <strong>${chars.length}</strong> | Занимают в сети: <strong>${allBytes.length} байт</strong> (<strong>${allBytes.length * 8} бит</strong>)`;
    summary.appendChild(sumLeft);

    grid.innerHTML = '';
    if (chars.length === 0) {
      grid.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px;">Напечатай хотя бы одну букву, чтобы увидеть байты...</div>`;
      this.updateMojibakeUI();
      return;
    }

    chars.forEach(ch => {
      const bytes = Array.from(this.encoder.encode(ch));
      const card = document.createElement('div');
      card.className = 'ascii-char-card';

      const charEl = document.createElement('div');
      charEl.className = 'ascii-char-glyph';
      charEl.textContent = ch === ' ' ? '␣' : ch;

      const typeBadge = document.createElement('div');
      typeBadge.className = 'ascii-type-badge';
      if (bytes.length === 1) {
        typeBadge.textContent = bytes[0] === 32 ? 'ASCII (Пробел)' : (bytes[0] >= 48 && bytes[0] <= 57 ? 'ASCII (Цифра)' : 'ASCII (1 байт)');
        typeBadge.style.color = 'var(--accent-green)';
      } else if (bytes.length === 2) {
        typeBadge.textContent = 'UTF-8 (2 байта)';
        typeBadge.style.color = 'var(--accent-cyan)';
      } else {
        typeBadge.textContent = `UTF-8 (${bytes.length} байта)`;
        typeBadge.style.color = 'var(--accent-purple)';
      }

      const decEl = document.createElement('div');
      decEl.className = 'ascii-meta-line';
      decEl.textContent = `DEC: ${bytes.join(' ')}`;

      const hexEl = document.createElement('div');
      hexEl.className = 'ascii-meta-line';
      hexEl.textContent = `HEX: ${bytes.map(b => BitMath.toHexString(b, 2)).join(' ')}`;

      const binEl = document.createElement('div');
      binEl.className = 'ascii-bin-line';
      binEl.textContent = bytes.map(b => BitMath.toBinaryString(b, 8)).join(' ');

      card.appendChild(charEl);
      card.appendChild(typeBadge);
      card.appendChild(decEl);
      card.appendChild(hexEl);
      card.appendChild(binEl);
      grid.appendChild(card);
    });

    this.updateMojibakeUI();
  }

  updateMojibakeUI() {
    const btn = this.container.querySelector('#btn-toggle-mojibake');
    const screen = this.container.querySelector('#mojibake-screen');
    const allBytes = this.encoder.encode(this.text);

    btn.classList.toggle('active', this.brokenEncoding);
    btn.textContent = this.brokenEncoding
      ? '✅ Вернуть нормальный UTF-8'
      : '⚠️ Прочитать как Windows-1251';

    let decoded = this.text;
    if (this.brokenEncoding) {
      try {
        decoded = new TextDecoder('windows-1251').decode(allBytes);
      } catch (e) {
        decoded = Array.from(allBytes).map(b => (b < 128 ? String.fromCharCode(b) : '')).join('');
      }
    }

    screen.innerHTML = '';
    const label = document.createElement('span');
    label.style.color = this.brokenEncoding ? 'var(--accent-red)' : 'var(--accent-green)';
    label.style.fontWeight = '700';
    label.textContent = this.brokenEncoding ? 'На экране (Кодировка перепутана — Win-1251): ' : 'На экране (Верная кодировка UTF-8): ';

    const out = document.createElement('code');
    out.style.fontSize = '1.05rem';
    out.textContent = decoded || '(пусто)';

    screen.appendChild(label);
    screen.appendChild(out);
  }

  updateBit5UI() {
    const stage = this.container.querySelector('#bit5-stage');
    const currentCode = this.bit5Active ? (this.bit5LetterCode + 32) : this.bit5LetterCode;
    const currentChar = String.fromCharCode(currentCode);
    const bin = BitMath.toBinaryString(currentCode, 8); // e.g. 01000001

    // Подсвечиваем ровно 5-й бит (индекс 2 в строке из 8 символов: [7,6,5,4,3,2,1,0])
    const prefix = bin.slice(0, 2); // биты 7 и 6: "01"
    const bit5 = bin[2];            // бит 5 (вес 32)
    const suffix = bin.slice(3);    // биты 4..0

    stage.innerHTML = `
      <div class="bit5-letter-choice">
        ${[65, 66, 71, 82].map(code => `
          <button class="topo-btn ${this.bit5LetterCode === code ? 'active' : ''}" data-b5char="${code}">
            ${String.fromCharCode(code)} / ${String.fromCharCode(code + 32)}
          </button>
        `).join('')}
      </div>

      <div class="bit5-display">
        <div class="bit5-char-box">${currentChar}</div>
        <div style="font-family: var(--font-mono); text-align: center;">
          <div>Код ASCII: <strong>${currentCode}</strong></div>
          <div style="font-size: 1.25rem; letter-spacing: 2px; margin-top: 4px;">
            <span>${prefix}</span><button id="btn-flip-bit5" class="bit5-inline-toggle ${this.bit5Active ? 'on' : ''}" title="Нажми, чтобы переключить Бит #5 (вес 32)">${bit5}</button><span>${suffix}</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
            ▲ нажми на подсвеченный Бит #5 (+32)
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-b5char]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.bit5LetterCode = parseInt(btn.dataset.b5char, 10);
        this.updateBit5UI();
      });
    });

    stage.querySelector('#btn-flip-bit5').addEventListener('click', () => {
      sounds.click();
      this.bit5Active = !this.bit5Active;
      this.updateBit5UI();
    });
  }
}
