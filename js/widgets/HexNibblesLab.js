/**
 * HexNibblesLab.js — Интерактивный сплиттер байта на два ниббла (тетрады) для изучения HEX
 * и живой миксер RGB HEX-цветов (#RRGGBB).
 */

import { BitMath } from '../engine/BitMath.js';
import { sounds } from '../audio/SoundManager.js';

export class HexNibblesLab {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.value = 0xAC; // По умолчанию красивое число 172 -> 1010 1100 -> 0xAC
    this.rgb = { r: 56, g: 189, b: 248 }; // #38BDF8
    this.mode = 'splitter'; // 'splitter' | 'rgb' | 'quiz'
    this.quizTarget = 0x5E;
    this.quizSolved = false;
    this.quizScore = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🔠</span>
            <span class="lab-title">Лаборатория HEX: Сплиттер нибблов и магия #RRGGBB</span>
          </div>
          <span class="lab-badge">HEX / 4-бит</span>
        </div>
        <div class="lab-body">
          <!-- Переключатель режимов -->
          <div class="topo-controls" style="margin-bottom: 18px;">
            <button class="topo-btn ${this.mode === 'splitter' ? 'active' : ''}" data-mode="splitter">✂️ Разрез байта на 2 ниббла</button>
            <button class="topo-btn ${this.mode === 'rgb' ? 'active' : ''}" data-mode="rgb">🎨 Цветовой код #RRGGBB</button>
            <button class="topo-btn ${this.mode === 'quiz' ? 'active' : ''}" data-mode="quiz">⚡ Блиц-переводчик</button>
          </div>

          <div id="hex-mode-content"></div>
        </div>
      </div>
    `;

    this.container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.mode = btn.dataset.mode;
        this.render();
      });
    });

    this.renderModeContent();
  }

  renderModeContent() {
    const host = this.container.querySelector('#hex-mode-content');
    if (this.mode === 'splitter') {
      this.renderSplitter(host);
    } else if (this.mode === 'rgb') {
      this.renderRgbMixer(host);
    } else {
      this.renderBlitzQuiz(host);
    }
  }

  renderSplitter(host) {
    const highNibble = (this.value >> 4) & 0x0F;
    const lowNibble = this.value & 0x0F;
    const highHex = highNibble.toString(16).toUpperCase();
    const lowHex = lowNibble.toString(16).toUpperCase();

    host.innerHTML = `
      <p style="font-size: 0.94rem; color: var(--text-muted); margin-bottom: 14px;">
        Секрет HEX прост: мы режем байт ровно пополам на <strong>два ниббла (по 4 бита)</strong>. У каждой половинки свои веса: <strong>8, 4, 2, 1</strong>!
      </p>

      <div class="nibbles-container">
        <!-- Левый ниббл -->
        <div class="nibble-card nibble-high">
          <div class="nibble-title">Левый ниббл (Старший)</div>
          <div class="nibble-bits" id="nibble-bits-high"></div>
          <div class="nibble-math" id="nibble-math-high"></div>
          <div class="nibble-hex-badge">HEX-цифра: <span id="nibble-char-high">${highHex}</span></div>
        </div>

        <div class="nibble-scissors" title="Граница половинок байта">✂️</div>

        <!-- Правый ниббл -->
        <div class="nibble-card nibble-low">
          <div class="nibble-title">Правый ниббл (Младший)</div>
          <div class="nibble-bits" id="nibble-bits-low"></div>
          <div class="nibble-math" id="nibble-math-low"></div>
          <div class="nibble-hex-badge">HEX-цифра: <span id="nibble-char-low">${lowHex}</span></div>
        </div>
      </div>

      <!-- Склейка итога -->
      <div class="hex-glue-box">
        <div class="hex-glue-item">
          <span class="res-label">Двоичный код (BIN)</span>
          <span class="res-val" id="split-bin" style="font-size: 1.2rem;"></span>
        </div>
        <div class="hex-glue-item">
          <span class="res-label">Склеенный HEX</span>
          <span class="res-val" id="split-hex" style="color: var(--accent-purple);">0x${highHex}${lowHex}</span>
        </div>
        <div class="hex-glue-item">
          <span class="res-label">Десятичное (DEC)</span>
          <span class="res-val" id="split-dec" style="color: var(--accent-green);">${this.value}</span>
        </div>
      </div>

      <div id="hex-explain-line" style="text-align: center; font-size: 0.9rem; color: var(--text-muted); margin-top: 10px;"></div>

      <div class="topo-controls" style="justify-content: center; margin-top: 16px;">
        <button class="topo-btn" data-preset="0xAC">0xAC (172)</button>
        <button class="topo-btn" data-preset="0xFF">0xFF (Максимум 255)</button>
        <button class="topo-btn" data-preset="0x7F">0x7F (127 — Localhost)</button>
        <button class="topo-btn" data-preset="0x41">0x41 (65 — Буква 'A')</button>
        <button class="topo-btn" id="btn-hex-rand">🎲 Случайный</button>
      </div>
    `;

    this.mountNibbleBits(host.querySelector('#nibble-bits-high'), 4);
    this.mountNibbleBits(host.querySelector('#nibble-bits-low'), 0);

    host.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.value = parseInt(btn.dataset.preset, 16);
        this.updateSplitterUI();
      });
    });

    host.querySelector('#btn-hex-rand').addEventListener('click', () => {
      sounds.click();
      this.value = Math.floor(Math.random() * 256);
      this.updateSplitterUI();
    });

    this.updateSplitterUI();
  }

  mountNibbleBits(targetEl, bitOffset) {
    targetEl.innerHTML = '';
    const weights = [8, 4, 2, 1];
    for (let i = 3; i >= 0; i--) {
      const bitIndex = bitOffset + i;
      const weight = weights[3 - i];

      const col = document.createElement('div');
      col.className = 'bit-col';

      const wSpan = document.createElement('span');
      wSpan.className = 'bit-weight';
      wSpan.textContent = weight;

      const btn = document.createElement('button');
      btn.className = 'bit-btn nibble-bit-btn';
      btn.dataset.bit = bitIndex;
      btn.textContent = (this.value & (1 << bitIndex)) ? '1' : '0';

      btn.addEventListener('click', () => {
        sounds.click();
        this.value ^= (1 << bitIndex);
        this.updateSplitterUI();
      });

      col.appendChild(wSpan);
      col.appendChild(btn);
      targetEl.appendChild(col);
    }
  }

  describeNibble(nibbleVal) {
    const weights = [];
    if (nibbleVal & 8) weights.push(8);
    if (nibbleVal & 4) weights.push(4);
    if (nibbleVal & 2) weights.push(2);
    if (nibbleVal & 1) weights.push(1);
    const expr = weights.length > 0 ? weights.join(' + ') : '0';
    const hex = nibbleVal.toString(16).toUpperCase();
    const mapNote = nibbleVal >= 10 ? ` (буква ${hex})` : '';
    return `${expr} = <strong>${nibbleVal}</strong>${mapNote}`;
  }

  updateSplitterUI() {
    const host = this.container.querySelector('#hex-mode-content');
    if (!host) return;

    host.querySelectorAll('.nibble-bit-btn').forEach(btn => {
      const bit = parseInt(btn.dataset.bit, 10);
      const isSet = (this.value & (1 << bit)) !== 0;
      btn.textContent = isSet ? '1' : '0';
      btn.classList.toggle('active', isSet);
    });

    const high = (this.value >> 4) & 0x0F;
    const low = this.value & 0x0F;
    const highHex = high.toString(16).toUpperCase();
    const lowHex = low.toString(16).toUpperCase();

    host.querySelector('#nibble-math-high').innerHTML = this.describeNibble(high);
    host.querySelector('#nibble-math-low').innerHTML = this.describeNibble(low);
    host.querySelector('#nibble-char-high').textContent = highHex;
    host.querySelector('#nibble-char-low').textContent = lowHex;

    const bin = BitMath.toBinaryString(this.value, 8);
    host.querySelector('#split-bin').textContent = `${bin.slice(0, 4)} ${bin.slice(4)}`;
    host.querySelector('#split-hex').textContent = `0x${highHex}${lowHex}`;
    host.querySelector('#split-dec').textContent = this.value;

    host.querySelector('#hex-explain-line').innerHTML =
      `Проверка: левый разряд «шестнадцаток» <strong>${high} × 16</strong> (${high * 16}) + правый разряд единиц <strong>${low}</strong> = <strong>${this.value}</strong>`;
  }

  renderRgbMixer(host) {
    const rHex = BitMath.toHexString(this.rgb.r, 2);
    const gHex = BitMath.toHexString(this.rgb.g, 2);
    const bHex = BitMath.toHexString(this.rgb.b, 2);
    const fullHex = `#${rHex}${gHex}${bHex}`;

    host.innerHTML = `
      <p style="font-size: 0.94rem; color: var(--text-muted); margin-bottom: 16px;">
        Каждый пиксель экрана состоит из 3 байтов: Красный (<strong>RR</strong>), Зелёный (<strong>GG</strong>) и Синий (<strong>BB</strong>). В веб-дизайне и играх их записывают подряд в HEX!
      </p>

      <div class="rgb-mixer-grid">
        <div class="rgb-sliders">
          <div class="rgb-row">
            <label style="color: #ef4444; font-weight: 700;">Красный (R): <span id="val-r">${this.rgb.r}</span> → <code id="hex-r">${rHex}</code></label>
            <input type="range" min="0" max="255" value="${this.rgb.r}" id="slider-r">
          </div>
          <div class="rgb-row">
            <label style="color: #22c55e; font-weight: 700;">Зелёный (G): <span id="val-g">${this.rgb.g}</span> → <code id="hex-g">${gHex}</code></label>
            <input type="range" min="0" max="255" value="${this.rgb.g}" id="slider-g">
          </div>
          <div class="rgb-row">
            <label style="color: #3b82f6; font-weight: 700;">Синий (B): <span id="val-b">${this.rgb.b}</span> → <code id="hex-b">${bHex}</code></label>
            <input type="range" min="0" max="255" value="${this.rgb.b}" id="slider-b">
          </div>
        </div>

        <div class="rgb-preview-card">
          <div id="rgb-swatch" class="rgb-swatch" style="background: ${fullHex};"></div>
          <div id="rgb-hex-code" class="rgb-hex-code">
            #<span style="color:#ef4444">${rHex}</span><span style="color:#22c55e">${gHex}</span><span style="color:#3b82f6">${bHex}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Итого: 3 байта (24 бита цвета)</div>
        </div>
      </div>

      <div class="topo-controls" style="justify-content: center; margin-top: 16px;">
        <button class="topo-btn" data-color="255,0,0">#FF0000 (Красный)</button>
        <button class="topo-btn" data-color="255,215,0">#FFD700 (Золотой)</button>
        <button class="topo-btn" data-color="124,58,237">#7C3AED (Неон фиолет)</button>
        <button class="topo-btn" data-color="0,0,0">#000000 (Чёрный)</button>
        <button class="topo-btn" data-color="255,255,255">#FFFFFF (Белый)</button>
      </div>
    `;

    ['r', 'g', 'b'].forEach(ch => {
      host.querySelector(`#slider-${ch}`).addEventListener('input', (e) => {
        this.rgb[ch] = parseInt(e.target.value, 10);
        this.updateRgbUI(host);
      });
    });

    host.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        const [r, g, b] = btn.dataset.color.split(',').map(Number);
        this.rgb = { r, g, b };
        host.querySelector('#slider-r').value = r;
        host.querySelector('#slider-g').value = g;
        host.querySelector('#slider-b').value = b;
        this.updateRgbUI(host);
      });
    });
  }

  updateRgbUI(host) {
    const rHex = BitMath.toHexString(this.rgb.r, 2);
    const gHex = BitMath.toHexString(this.rgb.g, 2);
    const bHex = BitMath.toHexString(this.rgb.b, 2);
    host.querySelector('#val-r').textContent = this.rgb.r;
    host.querySelector('#hex-r').textContent = rHex;
    host.querySelector('#val-g').textContent = this.rgb.g;
    host.querySelector('#hex-g').textContent = gHex;
    host.querySelector('#val-b').textContent = this.rgb.b;
    host.querySelector('#hex-b').textContent = bHex;

    const fullHex = `#${rHex}${gHex}${bHex}`;
    host.querySelector('#rgb-swatch').style.background = fullHex;
    host.querySelector('#rgb-hex-code').innerHTML =
      `#<span style="color:#ef4444">${rHex}</span><span style="color:#22c55e">${gHex}</span><span style="color:#3b82f6">${bHex}</span>`;
  }

  renderBlitzQuiz(host) {
    const highTarget = (this.quizTarget >> 4) & 0x0F;
    const lowTarget = this.quizTarget & 0x0F;
    const binHigh = BitMath.toBinaryString(highTarget, 4);
    const binLow = BitMath.toBinaryString(lowTarget, 4);

    host.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
        <div>
          <strong>⚡ Блиц-задача: Переведи двоичный байт в HEX!</strong>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Решено: <strong id="blitz-score" style="color: var(--accent-green);">${this.quizScore}</strong></div>
        </div>
        <button class="topo-btn active" id="btn-next-blitz">🎲 Новое число</button>
      </div>

      <div class="blitz-binary-display">
        <span class="blitz-nibble-high">${binHigh}</span>
        <span style="color: var(--text-muted);">|</span>
        <span class="blitz-nibble-low">${binLow}</span>
      </div>
      <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        Подсказка: веса в каждой половинке всегда <code>8 4 2 1</code>. Помни: 10=A, 11=B, 12=C, 13=D, 14=E, 15=F
      </div>

      <div style="display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="font-family: var(--font-mono); font-size: 1.4rem; font-weight: 800;">0x</span>
        <input type="text" id="blitz-input" maxlength="2" placeholder="??" class="blitz-input" autocomplete="off">
        <button class="topo-btn active" id="btn-check-blitz">Проверить</button>
      </div>

      <div id="blitz-feedback" style="margin-top: 14px; text-align: center; font-size: 0.95rem;"></div>
    `;

    const input = host.querySelector('#blitz-input');
    const check = () => {
      const userVal = input.value.trim().toUpperCase();
      const expected = BitMath.toHexString(this.quizTarget, 2);
      const fb = host.querySelector('#blitz-feedback');

      if (!/^[0-9A-F]{1,2}$/.test(userVal)) {
        sounds.error();
        fb.innerHTML = `<span style="color: var(--accent-amber);">Введи 2 шестнадцатеричные цифры от 0 до 9 или буквы A–F!</span>`;
        return;
      }

      if (userVal.padStart(2, '0') === expected) {
        if (!this.quizSolved) {
          this.quizSolved = true;
          this.quizScore += 1;
          host.querySelector('#blitz-score').textContent = this.quizScore;
        }
        sounds.success();
        fb.innerHTML = `<span style="color: var(--accent-green); font-weight: 700;">🎉 Точно в цель! <code>${binHigh}</code> = ${highTarget.toString(16).toUpperCase()}, <code>${binLow}</code> = ${lowTarget.toString(16).toUpperCase()} → <strong>0x${expected}</strong> (${this.quizTarget})!</span>`;
      } else {
        sounds.error();
        fb.innerHTML = `<span style="color: var(--accent-red);">❌ Не совсем. Посчитай отдельно левые 4 бита (<code>${binHigh}</code>) и правые 4 бита (<code>${binLow}</code>)!</span>`;
      }
    };

    host.querySelector('#btn-check-blitz').addEventListener('click', check);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') check();
    });

    host.querySelector('#btn-next-blitz').addEventListener('click', () => {
      sounds.click();
      this.quizTarget = Math.floor(Math.random() * 239) + 16; // от 0x10 до 0xFE, чтобы оба ниббла были интересными
      this.quizSolved = false;
      this.renderBlitzQuiz(host);
    });
  }
}
