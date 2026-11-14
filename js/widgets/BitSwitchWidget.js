/**
 * BitSwitchWidget.js — 8-битный интерактивный пульт v2.0.
 * Позволяет тактильно кликать по битам, видеть живую формулу сложения весов
 * и тренироваться в переводе чисел из десятичной в двоичную систему в режиме «Бинарный квест».
 */

import { BitMath } from '../engine/BitMath.js';
import { sounds } from '../audio/SoundManager.js';
import { AsciiTableModal } from './AsciiTableModal.js';

export class BitSwitchWidget {
  /**
   * @param {HTMLElement} container
   * @param {number} initialValue
   */
  constructor(container, initialValue = 0) {
    this.container = container;
    this.value = initialValue & 0xFF;
    this.codePage = 'windows-1252'; // Стандартная таблица шрифта Consolas в Windows 11 (ANSI)
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

          <!-- Переключатель таблицы ASCII Windows 11 -->
          <div class="codepage-selector-bar">
            <span class="codepage-label">Таблица:</span>
            <button class="topo-btn topo-btn-sm ${this.codePage === 'windows-1252' ? 'active' : ''}" data-cp="windows-1252" title="Стандарт Windows 11 (ANSI Win-1252)">
              🪟 Win-1252 (Стандарт)
            </button>
            <button class="topo-btn topo-btn-sm ${this.codePage === 'windows-1251' ? 'active' : ''}" data-cp="windows-1251" title="Русская таблица Windows (Windows-1251)">
              🇷🇺 Win-1251 (Русская)
            </button>
            <button class="topo-btn topo-btn-sm ${this.codePage === 'ibm866' ? 'active' : ''}" data-cp="ibm866" title="Консоль Windows cmd.exe / DOS (CP866)">
              📟 CP866 (Консоль cmd)
            </button>
            <button class="topo-btn topo-btn-sm" id="btn-open-ascii-modal" title="Открыть полную таблицу всех 256 символов">
              📖 Все 256 символов
            </button>
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
              <span class="res-label" id="res-ascii-label">Символ (Win-1252)</span>
              <span class="res-val" id="res-ascii" style="font-size: 1.15rem;">-</span>
              <span class="res-desc" id="res-ascii-desc"></span>
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

    // Переключатель кодовых страниц
    this.container.querySelectorAll('[data-cp]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.codePage = btn.dataset.cp;
        this.container.querySelectorAll('[data-cp]').forEach(b => {
          b.classList.toggle('active', b.dataset.cp === this.codePage);
        });
        this.update();
      });
    });

    // Открытие полной таблицы 256 символов
    this.container.querySelector('#btn-open-ascii-modal')?.addEventListener('click', () => {
      sounds.click();
      AsciiTableModal.open(this.codePage);
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

    // ASCII и таблица символов Windows 11
    const asciiInfo = BitSwitchWidget.getAsciiInfo(this.value, this.codePage);
    const asciiElem = this.container.querySelector('#res-ascii');
    const asciiDesc = this.container.querySelector('#res-ascii-desc');
    const asciiLabel = this.container.querySelector('#res-ascii-label');

    if (asciiLabel) {
      if (this.codePage === 'windows-1252') asciiLabel.textContent = 'Символ (Win-1252)';
      else if (this.codePage === 'windows-1251') asciiLabel.textContent = 'Символ (Win-1251)';
      else if (this.codePage === 'ibm866') asciiLabel.textContent = 'Символ (CP866)';
    }

    if (asciiElem) {
      asciiElem.textContent = asciiInfo.name;
      asciiElem.style.fontFamily = "'Consolas', var(--font-mono)";
      if (asciiInfo.category === 'russian') {
        asciiElem.style.color = 'var(--accent-green)';
      } else if (asciiInfo.category === 'extended') {
        asciiElem.style.color = 'var(--accent-cyan)';
      } else if (asciiInfo.category === 'console') {
        asciiElem.style.color = 'var(--accent-purple)';
      } else if (asciiInfo.category === 'command') {
        asciiElem.style.color = 'var(--accent-amber)';
      } else {
        asciiElem.style.color = 'var(--accent-cyan)';
      }
    }
    if (asciiDesc) {
      asciiDesc.textContent = asciiInfo.desc;
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

  /**
   * Возвращает расшифровку символа для выбранной кодовой страницы Windows 11:
   * - 0..31 и 127: служебные команды терминала с понятными названиями;
   * - 32: пробел;
   * - 33..126: печатные латинские символы и цифры;
   * - 128..255: символы стандартного шрифта Consolas / Windows-1252, Windows-1251 или CP866.
   * @param {number} code
   * @param {string} codePage
   * @returns {{ name: string, desc: string, category: 'command' | 'printable' | 'extended' | 'russian' | 'console' }}
   */
  static getAsciiInfo(code, codePage = 'windows-1252') {
    // 1. Служебные команды телетайпа и сетевых терминалов (0-31 и 127)
    const COMMAND_CODES = {
      0:  { name: '[Пустой байт / NUL]', desc: 'Завершитель строк в памяти и программах (код 0)' },
      1:  { name: '[Заголовок пакета]', desc: 'Служебный старт сетевого пакета (SOH, код 1)' },
      2:  { name: '[Начало текста]', desc: 'Маркер начала текста сообщения (STX, код 2)' },
      3:  { name: '[Конец текста]', desc: 'Маркер окончания текста сообщения (ETX, код 3)' },
      4:  { name: '[Конец связи]', desc: 'Разрыв сеанса передачи данных (EOT, код 4)' },
      5:  { name: '[Запрос связи]', desc: 'Запрос готовности («Кто на проводе?», ENQ, код 5)' },
      6:  { name: '[Подтверждение: Да]', desc: 'Ответ «Пакет принят без ошибок!» (ACK, код 6)' },
      7:  { name: '[Звонок терминала]', desc: 'Звуковой сигнал / бип спикера (BEL, код 7)' },
      8:  { name: '[Удаление назад]', desc: 'Клавиша Backspace / шаг назад (BS, код 8)' },
      9:  { name: '[Табуляция / Tab]', desc: 'Отступ на 4 или 8 пробелов (HT, код 9)' },
      10: { name: '[Новая строка / \\n]', desc: 'Перевод строки на строчку вниз (LF, код 10)' },
      11: { name: '[Вертикальный отступ]', desc: 'Вертикальный пропуск строк (VT, код 11)' },
      12: { name: '[Очистка экрана]', desc: 'Прогон листа на принтере / очистка (FF, код 12)' },
      13: { name: '[Возврат в начало / \\r]', desc: 'Возврат каретки в начало строки (CR, код 13)' },
      14: { name: '[Смена шрифта]', desc: 'Переключение на альтернативный набор (SO, код 14)' },
      15: { name: '[Обычный шрифт]', desc: 'Возврат к стандартному шрифту (SI, код 15)' },
      16: { name: '[Шифр канала]', desc: 'Экранирование служебных команд (DLE, код 16)' },
      17: { name: '[Старт потока]', desc: 'Команда «Продолжай передачу» (XON, код 17)' },
      18: { name: '[Вкл. прибор]', desc: 'Управление доп. устройством (DC2, код 18)' },
      19: { name: '[Пауза потока]', desc: 'Команда «Приостанови передачу» (XOFF, код 19)' },
      20: { name: '[Выкл. прибор]', desc: 'Управление доп. устройством (DC4, код 20)' },
      21: { name: '[Ошибка: Повтори!]', desc: 'Отказ приёма («Пакет повреждён!», NAK, код 21)' },
      22: { name: '[Синхронизация]', desc: 'Сигнал ожидания в канале связи (SYN, код 22)' },
      23: { name: '[Конец блока]', desc: 'Окончание блока данных (ETB, код 23)' },
      24: { name: '[Отмена команды]', desc: 'Сброс начатой операции (CAN, код 24)' },
      25: { name: '[Конец носителя]', desc: 'Физический конец ленты (EM, код 25)' },
      26: { name: '[Конец ввода / ^Z]', desc: 'Маркер завершения ввода файла (SUB, код 26)' },
      27: { name: '[Клавиша Esc]', desc: 'Отмена / старт ANSI-цветов в консоли (ESC, код 27)' },
      28: { name: '[Разделитель файлов]', desc: 'Граница файлов в общем потоке (FS, код 28)' },
      29: { name: '[Разделитель групп]', desc: 'Граница групп записей (GS, код 29)' },
      30: { name: '[Разделитель строк]', desc: 'Граница записей в таблице (RS, код 30)' },
      31: { name: '[Разделитель полей]', desc: 'Граница отдельных полей данных (US, код 31)' },
      127: { name: '[Удаление / Del]', desc: 'Клавиша Delete (пробиты все 7 бит, DEL, код 127)' }
    };

    if (COMMAND_CODES[code]) {
      return {
        name: COMMAND_CODES[code].name,
        desc: COMMAND_CODES[code].desc,
        category: 'command'
      };
    }

    // 2. Пробел (32)
    if (code === 32) {
      return {
        name: '[Пробел]',
        desc: 'Пробел между словами (код 32 / 0x20)',
        category: 'printable'
      };
    }

    // 3. Базовый печатный латинский диапазон ASCII (33–126)
    if (code >= 33 && code <= 126) {
      const ch = String.fromCharCode(code);
      let desc = 'Знак препинания / символ';
      if (code >= 48 && code <= 57) {
        desc = `Печатная цифра в тексте (код ${code})`;
      } else if (code >= 65 && code <= 90) {
        desc = `Заглавная латинская буква (код ${code})`;
      } else if (code >= 97 && code <= 122) {
        desc = `Строчная латинская буква (код ${code})`;
      }
      return {
        name: `'${ch}'`,
        desc,
        category: 'printable'
      };
    }

    // 4. Расширенный диапазон (128–255) в выбранной таблице Windows 11
    let char = '';
    try {
      char = new TextDecoder(codePage).decode(new Uint8Array([code]));
    } catch (e) {
      char = String.fromCharCode(code);
    }

    let desc = '';
    let category = 'extended';

    if (codePage === 'windows-1252') {
      // Стандартный шрифт Consolas / Windows 11 (ANSI)
      category = 'extended';
      if (code === 128) desc = 'Знак европейской валюты «€» (евро)';
      else if (code === 169) desc = 'Знак авторского права «©» (копирайт)';
      else if (code === 174) desc = 'Зарегистрированный знак «®»';
      else if (code === 176) desc = 'Знак градуса «°»';
      else if (code === 177) desc = 'Знак плюс-минус «±»';
      else if (code === 187 || code === 171) desc = `Типографская кавычка «${char}»`;
      else if (code === 192) desc = 'Заглавная латинская À с грависом (код 192)';
      else if (code === 223) desc = 'Немецкая буква эсцет «ß» (код 223)';
      else if (code === 255) desc = 'Строчная латинская ÿ с диэрезисом (код 255)';
      else desc = `Символ Win-1252 (код ${code})`;
    } else if (codePage === 'windows-1251') {
      // Русская Windows
      category = 'russian';
      if (code >= 192 && code <= 223) desc = `Русская заглавная буква «${char}» (код ${code})`;
      else if (code >= 224 && code <= 255) desc = `Русская строчная буква «${char}» (код ${code})`;
      else if (code === 168) desc = 'Русская заглавная буква «Ё» (код 168)';
      else if (code === 184) desc = 'Русская строчная буква «ё» (код 184)';
      else if (code === 185) desc = 'Символ знака номера «№» (код 185)';
      else desc = `Русский символ Windows-1251 (код ${code})`;
    } else if (codePage === 'ibm866') {
      // Консоль Windows cmd.exe / DOS
      category = 'console';
      if (code >= 128 && code <= 159) desc = `Русская заглавная буква «${char}» (DOS CP866)`;
      else if (code >= 160 && code <= 175) desc = `Русская строчная буква «${char}» (DOS CP866)`;
      else if (code >= 176 && code <= 223) desc = `Символ рамки / псевдографики «${char}» (CP866)`;
      else if (code >= 224 && code <= 239) desc = `Русская строчная буква «${char}» (DOS CP866)`;
      else desc = `Символ консоли Windows CP866 (код ${code})`;
    }

    return {
      name: `'${char}'`,
      desc,
      category
    };
  }
}
