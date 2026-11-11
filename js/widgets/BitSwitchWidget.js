/**
 * BitSwitchWidget.js — 8-битный интерактивный пульт v2.0.
 * Позволяет тактильно кликать по битам, видеть живую формулу сложения весов
 * и тренироваться в переводе чисел из десятичной в двоичную систему в режиме «Бинарный квест».
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
    this.questTarget = null;
    this.questScore = 0;
    this.questSolved = false;
    this.sampleQueue = [5, 13, 42, 65, 192, 170];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🎛️</span>
            <span class="lab-title">8-битный интерактивный пульт: Весы и Бинарный квест</span>
          </div>
          <span class="lab-badge">Практика L1</span>
        </div>
        <div class="lab-body">
          <p style="margin-bottom: 10px; font-size: 0.95rem; color: var(--text-muted);">
            Кликай по битам (тумблерам), чтобы включать (<strong>1</strong> — ток есть) и выключать (<strong>0</strong> — тока нет) веса двойки:
          </p>

          <!-- Тумблеры битов -->
          <div class="bits-row" id="bit-buttons-row"></div>

          <!-- Живая формула сложения -->
          <div class="bit-formula-bar" id="bit-formula-bar">
            Формула суммы: <code>0</code>
          </div>

          <!-- Быстрые пресеты -->
          <div class="topo-controls" style="justify-content: center; margin-top: 14px;">
            <button class="topo-btn" id="btn-all-zeros">Все нули (0)</button>
            <button class="topo-btn" id="btn-all-ones">Все единицы (255)</button>
            <button class="topo-btn" id="btn-mask-192">Число 192</button>
            <button class="topo-btn" id="btn-random-byte">🎲 Случайный байт</button>
          </div>

          <!-- Панель результатов -->
          <div class="bit-results">
            <div class="res-item">
              <span class="res-label">Двоичный (BIN)</span>
              <span class="res-val" id="res-bin" style="font-size: 1.15rem;">0000 0000</span>
            </div>
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
          </div>

          <!-- Режим тренажёра: Бинарный квест -->
          <div class="quest-panel" id="bit-quest-panel">
            <div class="quest-header">
              <div>
                <strong>🎯 Тренажёр «Собери число в двоичном виде»</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  Решено задач подряд: <span id="quest-score" style="color: var(--accent-green); font-weight: 700;">0</span>
                </div>
              </div>
              <button class="topo-btn active" id="btn-start-quest">🎲 Начать / Следующее</button>
            </div>
            <div id="quest-body" style="margin-top: 10px; display: none;">
              <div class="quest-prompt" id="quest-prompt"></div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                <button class="topo-btn" id="btn-quest-hint" style="font-size: 0.85rem;">💡 Подсказать первый шаг</button>
              </div>
              <div id="quest-feedback" style="margin-top: 10px; font-size: 0.92rem;"></div>
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
      weightSpan.innerHTML = `2<sup>${i}</sup> = <strong>${weight}</strong>`;

      const btn = document.createElement('button');
      btn.className = 'bit-btn';
      btn.dataset.bit = i;
      btn.textContent = '0';
      btn.title = `Бит ${i} (вес ${weight})`;

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

    // Квест
    this.container.querySelector('#btn-start-quest').addEventListener('click', () => {
      sounds.click();
      this.nextQuest();
    });
    this.container.querySelector('#btn-quest-hint').addEventListener('click', () => {
      sounds.click();
      this.showHint();
    });
  }

  nextQuest() {
    if (this.sampleQueue.length > 0) {
      this.questTarget = this.sampleQueue.shift();
    } else {
      this.questTarget = Math.floor(Math.random() * 254) + 1;
    }
    this.questSolved = false;
    this.value = 0;

    const body = this.container.querySelector('#quest-body');
    const prompt = this.container.querySelector('#quest-prompt');
    const feedback = this.container.querySelector('#quest-feedback');
    body.style.display = 'block';
    prompt.innerHTML = `Включи на тумблерах число: <span class="quest-target-badge">${this.questTarget}</span>`;
    feedback.innerHTML = `<span style="color: var(--text-muted);">Совет: откусывай самые большие веса двойки, которые помещаются в ${this.questTarget}!</span>`;

    this.update();
  }

  showHint() {
    if (this.questTarget === null || this.questSolved) return;
    const diff = this.questTarget - this.value;
    const feedback = this.container.querySelector('#quest-feedback');

    if (diff > 0) {
      // Находим самую большую степень двойки <= diff
      for (let i = 7; i >= 0; i--) {
        const w = 1 << i;
        if (w <= diff && !(this.value & w)) {
          feedback.innerHTML = `<span style="color: var(--accent-amber);">💡 Не хватает ещё <strong>${diff}</strong>. Самый крупный подходящий вес — это <strong>${w}</strong> (2<sup>${i}</sup>)!</span>`;
          return;
        }
      }
      feedback.innerHTML = `<span style="color: var(--accent-amber);">💡 Осталось набрать <strong>${diff}</strong>. Проверь, возможно, стоит выключить лишний крупный бит и собрать точнее.</span>`;
    } else if (diff < 0) {
      feedback.innerHTML = `<span style="color: var(--accent-red);">💡 Перебор на <strong>${Math.abs(diff)}</strong>! Выключи какой-нибудь лишний включённый тумблер.</span>`;
    }
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
    // Обновляем кнопки битов
    const btns = this.container.querySelectorAll('.bit-btn');
    const activeWeights = [];

    btns.forEach(btn => {
      const bit = parseInt(btn.dataset.bit, 10);
      const isSet = (this.value & (1 << bit)) !== 0;
      btn.textContent = isSet ? '1' : '0';
      btn.classList.toggle('active', isSet);
    });

    for (let i = 7; i >= 0; i--) {
      if ((this.value & (1 << i)) !== 0) {
        activeWeights.push(Math.pow(2, i));
      }
    }

    // Формула суммы
    const formulaBar = this.container.querySelector('#bit-formula-bar');
    if (activeWeights.length === 0) {
      formulaBar.innerHTML = `Формула суммы: <span style="color: var(--text-muted);">все тумблеры выключены</span> = <strong>0</strong>`;
    } else {
      const sumExpr = activeWeights.map(w => `<span class="formula-chip">${w}</span>`).join(' + ');
      formulaBar.innerHTML = `Формула суммы: ${sumExpr} = <strong style="color: var(--accent-cyan); font-size: 1.15em;">${this.value}</strong>`;
    }

    // Бинарная строка с пробелом посередине для читаемости
    const binStr = BitMath.toBinaryString(this.value, 8);
    this.container.querySelector('#res-bin').textContent = `${binStr.slice(0, 4)} ${binStr.slice(4)}`;
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

    // Проверка квеста
    if (this.questTarget !== null && !this.questSolved && this.value === this.questTarget) {
      this.questSolved = true;
      this.questScore += 1;
      sounds.success();
      this.container.querySelector('#quest-score').textContent = this.questScore;
      this.container.querySelector('#quest-feedback').innerHTML = `
        <div style="padding: 10px 14px; border-radius: var(--radius-sm); background: rgba(74, 222, 128, 0.15); border: 1px solid var(--accent-green); color: var(--accent-green); font-weight: 700;">
          🎉 Блестяще! ${activeWeights.join(' + ') || '0'} = ${this.questTarget} (в двоичном виде: <code>${binStr}</code>)! Нажми «🎲 Начать / Следующее» для новой задачи.
        </div>
      `;
    }
  }
}
