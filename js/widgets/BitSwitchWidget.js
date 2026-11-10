/**
 * BitSwitchWidget.js — 8-битный интерактивный пульт.
 * Позволяет тактильно кликать по битам, слушать щелчки и мгновенно видеть Dec/Hex/ASCII/Color.
 */

import { BitMath } from '../engine/BitMath.js';
import { sounds } from '../audio/SoundManager.js';

export class BitSwitchWidget {
  /**
   * @param {HTMLElement} container
   * @param {number} initialValue
   */
  constructor(container, initialValue = 0) {
    this.container = container;
    this.value = initialValue & 0xFF;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🎛️</span>
            <span class="lab-title">8-битный интерактивный пульт: Двоичный тренажер</span>
          </div>
          <span class="lab-badge">Практика L1</span>
        </div>
        <div class="lab-body">
          <p style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-muted);">
            Кликай по битам (тумблерам), чтобы включать (1) и выключать (0) электрические сигналы в проводе:
          </p>

          <div class="bits-row" id="bit-buttons-row"></div>

          <div class="topo-controls" style="justify-content: center; margin-top: 10px;">
            <button class="topo-btn" id="btn-all-zeros">Все нули (0)</button>
            <button class="topo-btn" id="btn-all-ones">Все единицы (255)</button>
            <button class="topo-btn" id="btn-random-byte">Случайный байт</button>
            <button class="topo-btn" id="btn-mask-192">Маска 192 (/26)</button>
          </div>

          <div class="bit-results">
            <div class="res-item">
              <span class="res-label">Десятичное (DEC)</span>
              <span class="res-val" id="res-dec">0</span>
            </div>
            <div class="res-item">
              <span class="res-label">Шестнадцатеричное</span>
              <span class="res-val" id="res-hex">0x00</span>
            </div>
            <div class="res-item">
              <span class="res-label">Символ (ASCII)</span>
              <span class="res-val" id="res-ascii">-</span>
            </div>
            <div class="res-item">
              <span class="res-label">Цвет байта</span>
              <div class="color-preview-box" id="res-color"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.mountButtons();
    this.update();
  }

  mountButtons() {
    const row = this.container.querySelector('#bit-buttons-row');
    row.innerHTML = '';

    for (let i = 7; i >= 0; i--) {
      const weight = Math.pow(2, i);
      const col = document.createElement('div');
      col.className = 'bit-col';

      const weightSpan = document.createElement('span');
      weightSpan.className = 'bit-weight';
      weightSpan.textContent = `2⁷ = ${weight}`.replace('7', this.toSuperscript(i));

      const btn = document.createElement('button');
      btn.className = 'bit-btn';
      btn.dataset.bit = i;
      btn.textContent = '0';

      btn.addEventListener('click', () => {
        sounds.click();
        this.toggleBit(i);
      });

      col.appendChild(weightSpan);
      col.appendChild(btn);
      row.appendChild(col);
    }

    // Кнопки пресетов
    this.container.querySelector('#btn-all-zeros').addEventListener('click', () => {
      sounds.click();
      this.setValue(0);
    });
    this.container.querySelector('#btn-all-ones').addEventListener('click', () => {
      sounds.click();
      this.setValue(255);
    });
    this.container.querySelector('#btn-random-byte').addEventListener('click', () => {
      sounds.click();
      this.setValue(Math.floor(Math.random() * 256));
    });
    this.container.querySelector('#btn-mask-192').addEventListener('click', () => {
      sounds.click();
      this.setValue(192);
    });
  }

  toSuperscript(num) {
    const chars = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'];
    return chars[num] || num;
  }

  toggleBit(bitIndex) {
    this.value ^= (1 << bitIndex);
    this.update();
  }

  setValue(val) {
    this.value = val & 0xFF;
    this.update();
  }

  update() {
    // Обновляем состояние кнопок
    const btns = this.container.querySelectorAll('.bit-btn');
    btns.forEach(btn => {
      const bit = parseInt(btn.dataset.bit, 10);
      const isSet = (this.value & (1 << bit)) !== 0;
      btn.textContent = isSet ? '1' : '0';
      btn.classList.toggle('active', isSet);
    });

    // Обновляем результаты
    this.container.querySelector('#res-dec').textContent = this.value;
    this.container.querySelector('#res-hex').textContent = `0x${BitMath.toHexString(this.value, 2)}`;

    // ASCII
    const asciiElem = this.container.querySelector('#res-ascii');
    if (this.value >= 33 && this.value <= 126) {
      asciiElem.textContent = `'${String.fromCharCode(this.value)}'`;
    } else if (this.value === 32) {
      asciiElem.textContent = '[Пробел]';
    } else {
      asciiElem.textContent = '[Спецкод]';
    }

    // Цвет (RGB / Hue)
    const colorBox = this.container.querySelector('#res-color');
    const hue = Math.round((this.value / 255) * 360);
    colorBox.style.backgroundColor = `hsl(${hue}, 85%, 55%)`;
  }
}
