/**
 * MorseTelegraphLab.js — Интерактивный симулятор телеграфа Самуэля Морзе.
 * Визуализирует физическое напряжение в проводе (0V и +5V), декодирует точки и тире,
 * генерирует звук зуммера через Web Audio API.
 */

import { sounds } from '../audio/SoundManager.js';

const MORSE_CODE = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
  '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
  '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
  '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
  '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
  '--..': 'Z', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
  '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9',
  '-----': '0'
};

export class MorseTelegraphLab {
  constructor(container) {
    this.container = container;
    this.isKeyDown = false;
    this.pressStartTime = 0;
    this.currentMorseSymbols = '';
    this.decodedText = '';
    this.silenceTimer = null;
    this.waveHistory = new Array(80).fill(0); // история уровней 0 и 1 для осциллографа
    this.animId = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">📻</span>
            <span class="lab-title">Телеграф Морзе: Как напряжение в проводе становится буквой</span>
          </div>
          <span class="lab-badge">Физика L1</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 14px;">
            Удерживай кнопку телеграфного ключа (или пробел на клавиатуре). Короткий клик — точка (•), длинный — тире (—).
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <!-- Левая колонка: Ключ передатчика -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 20px; border: 1px solid var(--border-color);">
              <button id="telegraph-key-btn" style="
                width: 140px; height: 140px; border-radius: 50%;
                background: linear-gradient(145deg, #0284c7, #0369a1);
                border: 4px solid var(--accent-cyan);
                color: #fff; font-size: 1.1rem; font-weight: 800;
                cursor: pointer; user-select: none;
                box-shadow: 0 8px 24px rgba(2, 132, 199, 0.4);
                transition: transform 0.08s, box-shadow 0.08s;
                display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
                <span>⚡ КЛЮЧ</span>
                <span style="font-size: 0.75rem; font-weight: 600; opacity: 0.85;">(Удерживай)</span>
              </button>
              <div id="voltage-indicator" style="margin-top: 14px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">
                Провод: 0 Вольт (Логический 0)
              </div>
            </div>

            <!-- Правая колонка: Осциллограф сигнала -->
            <div style="background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 6px;">
                <span>Осциллограф напряжения</span>
                <span style="color: var(--accent-cyan);">+5V ━━━ 0V</span>
              </div>
              <canvas id="oscilloscope-canvas" width="300" height="110" style="width: 100%; height: 110px; background: #060911; border-radius: 6px; border: 1px solid var(--border-color);"></canvas>
            </div>
          </div>

          <!-- Приемник и расшифрованные буквы -->
          <div style="background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="font-size: 0.92rem; color: var(--accent-green);">Приемная станция телеграфа:</strong>
              <button class="topo-btn" id="btn-clear-morse" style="padding: 4px 10px; font-size: 0.75rem;">Очистить ленту</button>
            </div>
            <div style="display: flex; gap: 12px; align-items: baseline;">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Текущий знак:</span>
              <span id="morse-current-symbols" style="font-family: var(--font-mono); font-size: 1.4rem; color: var(--accent-amber); font-weight: 700; min-height: 28px;"></span>
            </div>
            <div style="margin-top: 8px; font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: var(--accent-cyan); background: var(--bg-surface); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); min-height: 48px;" id="morse-decoded-output">
              _
            </div>
          </div>

          <!-- Кнопки быстрых сообщений -->
          <div class="topo-controls" style="align-items: center;">
            <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Автопередача:</span>
            <button class="topo-btn" id="btn-send-sos">🆘 Сигнал SOS (... --- ...)</button>
            <button class="topo-btn" id="btn-send-hi">👋 Слово HI (.... ..)</button>
            <button class="topo-btn" id="btn-send-roblox">🎮 ROBLOX</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.startOscilloscope();
  }

  bindEvents() {
    const keyBtn = this.container.querySelector('#telegraph-key-btn');

    const pressKey = () => {
      if (this.isKeyDown) return;
      this.isKeyDown = true;
      this.pressStartTime = Date.now();
      keyBtn.style.transform = 'scale(0.92)';
      keyBtn.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.6)';
      keyBtn.style.background = 'linear-gradient(145deg, #38bdf8, #0284c7)';
      sounds.startMorseTone(680);
      this.setVoltageStatus(true);
      clearTimeout(this.silenceTimer);
    };

    const releaseKey = () => {
      if (!this.isKeyDown) return;
      this.isKeyDown = false;
      const duration = Date.now() - this.pressStartTime;
      keyBtn.style.transform = 'scale(1)';
      keyBtn.style.boxShadow = '0 8px 24px rgba(2, 132, 199, 0.4)';
      keyBtn.style.background = 'linear-gradient(145deg, #0284c7, #0369a1)';
      sounds.stopMorseTone();
      this.setVoltageStatus(false);

      // Определение точки или тире (граница ~220мс)
      const symbol = duration < 220 ? '.' : '-';
      this.currentMorseSymbols += symbol;
      this.container.querySelector('#morse-current-symbols').textContent = this.currentMorseSymbols;

      // Запуск таймера тишины: пауза 650мс = конец буквы
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        this.decodeCurrentSymbol();
      }, 650);
    };

    // Мышь и Touch
    keyBtn.addEventListener('mousedown', pressKey);
    keyBtn.addEventListener('mouseup', releaseKey);
    keyBtn.addEventListener('mouseleave', releaseKey);
    keyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); pressKey(); });
    keyBtn.addEventListener('touchend', (e) => { e.preventDefault(); releaseKey(); });

    // Очистить
    this.container.querySelector('#btn-clear-morse').addEventListener('click', () => {
      sounds.click();
      this.decodedText = '';
      this.currentMorseSymbols = '';
      this.container.querySelector('#morse-decoded-output').textContent = '_';
      this.container.querySelector('#morse-current-symbols').textContent = '';
    });

    // Автоматическая передача фраз
    this.container.querySelector('#btn-send-sos').addEventListener('click', () => {
      this.playAutoSequence('... --- ...');
    });
    this.container.querySelector('#btn-send-hi').addEventListener('click', () => {
      this.playAutoSequence('.... ..');
    });
    this.container.querySelector('#btn-send-roblox').addEventListener('click', () => {
      this.playAutoSequence('.-. --- -... .-.. --- -..-');
    });
  }

  setVoltageStatus(isHigh) {
    const el = this.container.querySelector('#voltage-indicator');
    if (el) {
      if (isHigh) {
        el.textContent = '⚡ Провод: +5 Вольт (Логическая 1)';
        el.style.color = 'var(--accent-amber)';
      } else {
        el.textContent = 'Провод: 0 Вольт (Логический 0)';
        el.style.color = 'var(--text-muted)';
      }
    }
  }

  decodeCurrentSymbol() {
    if (!this.currentMorseSymbols) return;
    const letter = MORSE_CODE[this.currentMorseSymbols] || '?';
    this.decodedText += letter;
    this.container.querySelector('#morse-decoded-output').textContent = this.decodedText;
    this.currentMorseSymbols = '';
    this.container.querySelector('#morse-current-symbols').textContent = '';
    sounds.packetArrive();
  }

  playAutoSequence(sequence) {
    let delay = 0;
    for (const char of sequence) {
      if (char === '.') {
        setTimeout(() => sounds.playMorseTone(false), delay);
        delay += 160;
      } else if (char === '-') {
        setTimeout(() => sounds.playMorseTone(true), delay);
        delay += 280;
      } else if (char === ' ') {
        delay += 300;
      }
    }
    // После завершения выводим готовый текст
    setTimeout(() => {
      const words = sequence.split(' ').map(s => MORSE_CODE[s] || '').join('');
      this.decodedText += (this.decodedText ? ' ' : '') + words;
      this.container.querySelector('#morse-decoded-output').textContent = this.decodedText;
      sounds.success();
    }, delay + 100);
  }

  startOscilloscope() {
    const canvas = this.container.querySelector('#oscilloscope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      // Добавляем текущее значение напряжения (1 если кнопка зажата, 0 если отпущена)
      this.waveHistory.shift();
      this.waveHistory.push(this.isKeyDown ? 1 : 0);

      // Отрисовка осциллографа
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Сетка
      ctx.strokeStyle = '#152033';
      ctx.lineWidth = 1;
      for (let y = 15; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Линия импульса (неоново-голубая)
      ctx.strokeStyle = this.isKeyDown ? '#38bdf8' : '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = this.isKeyDown ? 8 : 2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const stepX = canvas.width / (this.waveHistory.length - 1);
      const highY = 22; // +5V
      const lowY = 88;  // 0V

      for (let i = 0; i < this.waveHistory.length; i++) {
        const val = this.waveHistory[i];
        const x = i * stepX;
        const y = val === 1 ? highY : lowY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Ступенчатый прямоугольный импульс (Square wave)
          const prevVal = this.waveHistory[i - 1];
          const prevY = prevVal === 1 ? highY : lowY;
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      this.animId = requestAnimationFrame(loop);
    };

    loop();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
