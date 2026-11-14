/**
 * AsciiTableModal.js — Интерактивное модальное окно полной таблицы на 256 символов (0..255)
 * с поддержкой Windows-1252 (Consolas / Win 11), Windows-1251 (Русская) и CP866 (Консоль cmd.exe).
 */

import { BitMath } from '../engine/BitMath.js';
import { BitSwitchWidget } from './BitSwitchWidget.js';
import { sounds } from '../audio/SoundManager.js';

export class AsciiTableModal {
  static currentModal = null;

  /**
   * Открывает модальное окно таблицы 256 символов.
   * @param {string} initialCodePage 'windows-1252' | 'windows-1251' | 'ibm866'
   */
  static open(initialCodePage = 'windows-1252') {
    if (this.currentModal) {
      this.currentModal.close();
    }
    this.currentModal = new AsciiTableModal(initialCodePage);
  }

  constructor(codePage) {
    this.codePage = codePage;
    this.filterQuery = '';
    this.selectedCode = 65; // 'A'
    this.render();
  }

  render() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ascii-modal-overlay';
    this.overlay.innerHTML = `
      <div class="ascii-modal-box" role="dialog" aria-modal="true" aria-labelledby="ascii-modal-title">
        <div class="ascii-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">📖</span>
            <div>
              <h3 id="ascii-modal-title" style="margin: 0; font-size: 1.15rem; color: var(--text-main);">
                Полная таблица на 256 символов (Байты 0–255)
              </h3>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                Кликай по любой ячейке, чтобы изучить код, HEX, BIN и значение символа
              </div>
            </div>
          </div>
          <button class="ascii-modal-close-btn" id="btn-ascii-modal-close" aria-label="Закрыть">✕</button>
        </div>

        <div class="ascii-modal-controls">
          <div class="codepage-tabs">
            <button class="topo-btn topo-btn-sm ${this.codePage === 'windows-1252' ? 'active' : ''}" data-modal-cp="windows-1252">
              🪟 Win-1252 (Стандарт Win 11)
            </button>
            <button class="topo-btn topo-btn-sm ${this.codePage === 'windows-1251' ? 'active' : ''}" data-modal-cp="windows-1251">
              🇷🇺 Win-1251 (Русская)
            </button>
            <button class="topo-btn topo-btn-sm ${this.codePage === 'ibm866' ? 'active' : ''}" data-modal-cp="ibm866">
              📟 CP866 (Консоль cmd)
            </button>
          </div>

          <input type="text" id="ascii-modal-search" class="ascii-modal-search" placeholder="🔍 Поиск по коду или символу...">
        </div>

        <!-- 16x16 сетка символов -->
        <div class="ascii-grid-scroll">
          <div class="ascii-matrix-grid" id="ascii-matrix-grid"></div>
        </div>

        <!-- Инспектор выбранного символа -->
        <div class="ascii-modal-inspector" id="ascii-modal-inspector"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Закрытие
    this.overlay.querySelector('#btn-ascii-modal-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.keydownHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this.keydownHandler);

    // Вкладки кодировок
    this.overlay.querySelectorAll('[data-modal-cp]').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.click();
        this.codePage = btn.getAttribute('data-modal-cp');
        this.overlay.querySelectorAll('[data-modal-cp]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-modal-cp') === this.codePage);
        });
        this.buildGrid();
        this.updateInspector();
      });
    });

    // Поиск
    const searchInput = this.overlay.querySelector('#ascii-modal-search');
    searchInput.addEventListener('input', (e) => {
      this.filterQuery = e.target.value.trim().toLowerCase();
      this.buildGrid();
    });

    this.buildGrid();
    this.updateInspector();
  }

  buildGrid() {
    const grid = this.overlay.querySelector('#ascii-matrix-grid');
    grid.innerHTML = '';

    for (let code = 0; code < 256; code++) {
      const info = BitSwitchWidget.getAsciiInfo(code, this.codePage);
      const hex = BitMath.toHexString(code, 2);
      const dec = code.toString();

      // Фильтрация поиска
      if (this.filterQuery) {
        const matchCode = dec.includes(this.filterQuery);
        const matchHex = hex.toLowerCase().includes(this.filterQuery);
        const matchName = info.name.toLowerCase().includes(this.filterQuery);
        const matchDesc = info.desc.toLowerCase().includes(this.filterQuery);
        if (!matchCode && !matchHex && !matchName && !matchDesc) {
          continue;
        }
      }

      const cell = document.createElement('div');
      cell.className = `ascii-cell ${info.category} ${code === this.selectedCode ? 'selected' : ''}`;
      cell.dataset.code = code;

      // Краткое имя для клетки
      let displayGlyph = info.name;
      if (displayGlyph.startsWith("'") && displayGlyph.endsWith("'")) {
        displayGlyph = displayGlyph.slice(1, -1);
      } else if (displayGlyph.startsWith('[') && displayGlyph.endsWith(']')) {
        // Сокращаем служебные имена для клетки
        const shortMatch = info.name.match(/\b([A-Z0-9\^]{2,4}|[NUL|ESC|DEL|CR|LF|TAB|SP]+)\b/);
        displayGlyph = shortMatch ? shortMatch[1] : displayGlyph.slice(1, 5);
      }

      cell.innerHTML = `
        <span class="ascii-cell-dec">${code}</span>
        <span class="ascii-cell-glyph">${displayGlyph}</span>
        <span class="ascii-cell-hex">${hex}</span>
      `;
      cell.title = `Код ${code} (0x${hex}): ${info.name}\n${info.desc}`;

      cell.addEventListener('click', () => {
        sounds.click();
        this.selectedCode = code;
        this.overlay.querySelectorAll('.ascii-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        this.updateInspector();
      });

      grid.appendChild(cell);
    }
  }

  updateInspector() {
    const insp = this.overlay.querySelector('#ascii-modal-inspector');
    const code = this.selectedCode;
    const info = BitSwitchWidget.getAsciiInfo(code, this.codePage);
    const hex = `0x${BitMath.toHexString(code, 2)}`;
    const bin = BitMath.toBinaryString(code, 8);
    const binFormatted = `${bin.slice(0, 4)} ${bin.slice(4)}`;

    insp.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div class="ascii-insp-badge ${info.category}">
          ${info.name}
        </div>
        <div class="ascii-insp-data">
          <div>DEC: <strong>${code}</strong> &nbsp;|&nbsp; HEX: <strong>${hex}</strong> &nbsp;|&nbsp; BIN: <code>${binFormatted}</code></div>
          <div style="color: var(--text-muted); font-size: 0.88rem; margin-top: 2px;">
            ${info.desc}
          </div>
        </div>
      </div>
    `;
  }

  close() {
    window.removeEventListener('keydown', this.keydownHandler);
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    AsciiTableModal.currentModal = null;
  }
}
