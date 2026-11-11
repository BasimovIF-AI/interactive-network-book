/**
 * app.js — Главный контроллер интерактивной книги: навигация по главам,
 * переключение тем (Modern Web Guidance), монтирование виджетов и квизов.
 */

import { CHAPTERS } from './content/chaptersData.js';
import { sounds } from './audio/SoundManager.js';
import { MorseTelegraphLab } from './widgets/MorseTelegraphLab.js';
import { BitSwitchWidget } from './widgets/BitSwitchWidget.js';
import { HexNibblesLab } from './widgets/HexNibblesLab.js';
import { AsciiTextEncoderLab } from './widgets/AsciiTextEncoderLab.js';
import { CableInterferenceLab } from './widgets/CableInterferenceLab.js';
import { TopologyLab } from './widgets/TopologyLab.js';
import { OsiLayersExplorer } from './widgets/OsiLayersExplorer.js';
import { OsiElevatorGame } from './widgets/OsiElevatorGame.js';
import { EncapsulationBox } from './widgets/EncapsulationBox.js';
import { SwitchCamLab } from './widgets/SwitchCamLab.js';
import { SubnetCutter } from './widgets/SubnetCutter.js';
import { RouterCompass } from './widgets/RouterCompass.js';
import { TcpHandshakeSim } from './widgets/TcpHandshakeSim.js';
import { NetworkServicesLab } from './widgets/NetworkServicesLab.js';
import { PacketTracerLite } from './widgets/PacketTracerLite.js';

export class BookApp {
  constructor() {
    this.currentChapterIndex = 0;
    this.currentWidget = null;
    const validIds = new Set(CHAPTERS.map(c => c.id));
    const saved = JSON.parse(localStorage.getItem('completed_chapters') || '[]');
    this.completedChapters = new Set(saved.filter(id => validIds.has(id)));
    this.init();
  }

  init() {
    this.setupTheme();
    this.buildToc();
    this.bindGlobalEvents();
    this.loadChapter(0);
  }

  setupTheme() {
    const metaTheme = document.querySelector('meta[name="color-scheme"]');
    const themeBtn = document.querySelector('#btn-theme-toggle');

    const updateThemeIcon = (scheme) => {
      if (themeBtn) {
        themeBtn.textContent = scheme === 'dark' ? '☀️' : '🌙';
        themeBtn.title = scheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему';
      }
    };

    const currentScheme = localStorage.getItem('color-scheme') || 'light dark';
    if (metaTheme) metaTheme.content = currentScheme;
    updateThemeIcon(currentScheme === 'dark' ? 'dark' : 'light');

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        sounds.click();
        const isDark = document.documentElement.matches(':has(> head > meta[name="color-scheme"][content="dark"])') ||
          (metaTheme.content === 'light dark' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const next = isDark ? 'light' : 'dark';
        metaTheme.content = next;
        localStorage.setItem('color-scheme', next);
        updateThemeIcon(next);
      });
    }
  }

  buildToc() {
    const nav = document.querySelector('#toc-nav');
    if (!nav) return;
    nav.innerHTML = '';

    let currentPartTitle = '';
    CHAPTERS.forEach((ch, idx) => {
      if (ch.part !== currentPartTitle) {
        currentPartTitle = ch.part;
        const partEl = document.createElement('div');
        partEl.className = 'toc-part-title';
        partEl.textContent = currentPartTitle;
        nav.appendChild(partEl);
      }

      const item = document.createElement('a');
      item.className = `toc-item ${this.completedChapters.has(ch.id) ? 'completed' : ''}`;
      item.dataset.index = idx;
      item.innerHTML = `
        <span class="toc-check">${this.completedChapters.has(ch.id) ? '✓' : '○'}</span>
        <span><strong>${ch.badge}:</strong> ${ch.title}</span>
      `;

      item.addEventListener('click', (e) => {
        e.preventDefault();
        sounds.click();
        this.loadChapter(idx);
        document.querySelector('#sidebar')?.classList.remove('open');
      });

      nav.appendChild(item);
    });

    this.updateProgressBar();
  }

  bindGlobalEvents() {
    const soundBtn = document.querySelector('#btn-sound-toggle');
    if (soundBtn) {
      soundBtn.textContent = sounds.isMuted ? '🔇' : '🔊';
      soundBtn.addEventListener('click', () => {
        const muted = sounds.toggleMute();
        soundBtn.textContent = muted ? '🔇' : '🔊';
        if (!muted) sounds.click();
      });
    }

    const menuBtn = document.querySelector('#btn-toggle-sidebar');
    const sidebar = document.querySelector('#sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sounds.click();
        sidebar.classList.toggle('open');
      });
    }
  }

  loadChapter(index) {
    if (index < 0 || index >= CHAPTERS.length) return;

    // Уничтожаем предыдущий виджет (очистка анимаций)
    if (this.currentWidget && typeof this.currentWidget.destroy === 'function') {
      this.currentWidget.destroy();
      this.currentWidget = null;
    }

    this.currentChapterIndex = index;
    const ch = CHAPTERS[index];

    // Подсветка в оглавлении
    document.querySelectorAll('.toc-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    const contentView = document.querySelector('#content-view');
    if (!contentView) return;

    contentView.innerHTML = `
      <div class="chapter-badge">${ch.badge} • ${ch.part}</div>
      <h1 class="chapter-title">${ch.title}</h1>
      <p class="lead-paragraph">${ch.lead}</p>

      <!-- Развернутый фундаментальный текст главы с аналогиями и терминами -->
      <div class="chapter-narrative-area">
        ${ch.narrativeHtml}
      </div>

      <!-- Контейнер интерактивного виджета -->
      <div id="active-widget-mount"></div>

      <!-- Карточка квиза для закрепления знаний -->
      <div class="quiz-card" id="quiz-mount">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 1.3rem;">🧠</span>
          <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--accent-cyan); letter-spacing: 0.05em;">Проверка знаний</span>
        </div>
        <div class="quiz-question">${ch.quiz.question}</div>
        <div class="quiz-options" id="quiz-options-list"></div>
        <div class="quiz-feedback" id="quiz-feedback-box"></div>
      </div>

      <!-- Футер с навигацией по главам -->
      <div class="chapter-nav-footer">
        ${index > 0 ? `
          <button class="nav-ch-btn" id="btn-prev-chapter">
            <span class="label">◀ Предыдущая глава</span>
            <span class="title">${CHAPTERS[index - 1].badge}</span>
          </button>
        ` : '<div></div>'}
        
        ${index < CHAPTERS.length - 1 ? `
          <button class="nav-ch-btn" id="btn-next-chapter" style="text-align: right; margin-left: auto;">
            <span class="label">Следующая глава ▶</span>
            <span class="title">${CHAPTERS[index + 1].badge}</span>
          </button>
        ` : `
          <div style="font-weight: 700; color: var(--accent-green); display: flex; align-items: center; gap: 6px;">
            🎓 Поздравляем! Весь курс успешно завершен!
          </div>
        `}
      </div>
    `;

    // Монтирование интерактивного виджета
    const widgetMount = contentView.querySelector('#active-widget-mount');
    switch (ch.widgetType) {
      case 'morse-telegraph':
        this.currentWidget = new MorseTelegraphLab(widgetMount);
        break;
      case 'bit-switch':
        this.currentWidget = new BitSwitchWidget(widgetMount);
        break;
      case 'hex-nibbles':
        this.currentWidget = new HexNibblesLab(widgetMount);
        break;
      case 'ascii-encoder':
        this.currentWidget = new AsciiTextEncoderLab(widgetMount);
        break;
      case 'cable-interference':
        this.currentWidget = new CableInterferenceLab(widgetMount);
        break;
      case 'topology-lab':
        this.currentWidget = new TopologyLab(widgetMount);
        break;
      case 'osi-explorer':
        this.currentWidget = new OsiLayersExplorer(widgetMount);
        break;
      case 'osi-elevator':
        this.currentWidget = new OsiElevatorGame(widgetMount);
        break;
      case 'encapsulation':
        this.currentWidget = new EncapsulationBox(widgetMount);
        break;
      case 'switch-cam':
        this.currentWidget = new SwitchCamLab(widgetMount);
        break;
      case 'subnet-cutter':
        this.currentWidget = new SubnetCutter(widgetMount);
        break;
      case 'router-compass':
        this.currentWidget = new RouterCompass(widgetMount);
        break;
      case 'tcp-handshake':
        this.currentWidget = new TcpHandshakeSim(widgetMount);
        break;
      case 'network-services':
        this.currentWidget = new NetworkServicesLab(widgetMount);
        break;
      case 'packet-tracer-lite':
        this.currentWidget = new PacketTracerLite(widgetMount);
        break;
    }

    // Монтирование квиза
    this.mountQuiz(ch);

    // Слушатели кнопок в футере
    const prevBtn = contentView.querySelector('#btn-prev-chapter');
    const nextBtn = contentView.querySelector('#btn-next-chapter');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        sounds.click();
        this.loadChapter(index - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        sounds.click();
        this.loadChapter(index + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  mountQuiz(ch) {
    const list = document.querySelector('#quiz-options-list');
    const feedback = document.querySelector('#quiz-feedback-box');
    if (!list) return;

    ch.quiz.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = `${['A', 'B', 'C', 'D'][idx]}) ${opt}`;

      btn.addEventListener('click', () => {
        const isCorrect = idx === ch.quiz.correctIndex;
        if (isCorrect) {
          sounds.success();
          btn.classList.add('correct');
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(74, 222, 128, 0.15)';
          feedback.style.color = 'var(--accent-green)';
          feedback.innerHTML = `🎉 <strong>Правильно!</strong> ${ch.quiz.explanation}`;

          // Отмечаем главу пройденной
          this.completedChapters.add(ch.id);
          localStorage.setItem('completed_chapters', JSON.stringify(Array.from(this.completedChapters)));
          this.buildToc();
        } else {
          sounds.error();
          btn.classList.add('incorrect');
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(248, 113, 113, 0.15)';
          feedback.style.color = 'var(--accent-red)';
          feedback.innerHTML = `❌ <strong>Не совсем так.</strong> Попробуй еще раз или перечитай описание виджета!`;
        }
      });

      list.appendChild(btn);
    });
  }

  updateProgressBar() {
    const fill = document.querySelector('#progress-bar-fill');
    const text = document.querySelector('#progress-text');
    const total = CHAPTERS.length;
    const completed = this.completedChapters.size;
    const percent = Math.round((completed / total) * 100);

    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `Пройдено ${completed} из ${total} глав (${percent}%)`;
  }
}

// Запуск приложения
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new BookApp();
  });
}
