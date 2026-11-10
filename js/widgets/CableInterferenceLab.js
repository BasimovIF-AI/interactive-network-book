/**
 * CableInterferenceLab.js — Интерактивный симулятор сред передачи данных и помех.
 * Моделирует физику медной витой пары, оптоволокна и Wi-Fi, демонстрирует затухание
 * сигнала (Attenuation) при превышении 100 метров и наводки от микроволновки.
 */

import { sounds } from '../audio/SoundManager.js';

export class CableInterferenceLab {
  constructor(container) {
    this.container = container;
    this.mediaType = 'copper'; // 'copper' | 'fiber' | 'wifi'
    this.distance = 50; // метры
    this.isMicrowaveOn = false;
    this.isPowerCableNear = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🔌</span>
            <span class="lab-title">Лаборатория сред передачи: Медь, Стекло, Радиоволны и Помехи</span>
          </div>
          <span class="lab-badge">Физика L1</span>
        </div>
        <div class="lab-body">
          <!-- Выбор среды передачи -->
          <div class="topo-controls" style="margin-bottom: 16px;">
            <button class="topo-btn active" data-media="copper">🥉 Медь (Витая пара Cat5e)</button>
            <button class="topo-btn" data-media="fiber">💎 Оптоволокно (Стекло + Лазер)</button>
            <button class="topo-btn" data-media="wifi">📡 Wi-Fi 2.4 GHz (Радиоволны)</button>
          </div>

          <!-- Регулировка дистанции кабеля -->
          <div style="background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 18px; border: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 0.95rem;">
                Длина линии связи: <span id="cable-distance-val" style="color: var(--accent-cyan); font-family: var(--font-mono);">${this.distance} метров</span>
              </span>
              <span id="standard-100m-badge" style="font-size: 0.75rem; font-family: var(--font-mono); padding: 2px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: var(--accent-green);">
                В пределах стандарта (≤100м)
              </span>
            </div>
            <input type="range" id="cable-dist-slider" min="10" max="150" value="${this.distance}" step="5" style="width: 100%;" />
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">
              <span>10 метров (Комната)</span>
              <span>100м (Лимит стандарта Ethernet)</span>
              <span>150 метров (Критическое затухание)</span>
            </div>
          </div>

          <!-- Источники электромагнитных помех -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <button class="topo-btn" id="btn-toggle-microwave" style="padding: 12px; display: flex; align-items: center; gap: 8px; text-align: left;">
              <span style="font-size: 1.4rem;">🍿</span>
              <div>
                <strong>Микроволновка (2.45 GHz)</strong><br/>
                <span id="label-microwave-status" style="font-size: 0.75rem; color: var(--text-muted);">ВЫКЛ</span>
              </div>
            </button>
            <button class="topo-btn" id="btn-toggle-power" style="padding: 12px; display: flex; align-items: center; gap: 8px; text-align: left;">
              <span style="font-size: 1.4rem;">⚡</span>
              <div>
                <strong>Силовой кабель 220V</strong><br/>
                <span id="label-power-status" style="font-size: 0.75rem; color: var(--text-muted);">ВЫКЛ (На расстоянии)</span>
              </div>
            </button>
          </div>

          <!-- Показатели качества сигнала (Осциллограмма и метрики) -->
          <div style="background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-family: var(--font-mono); font-size: 0.88rem; margin-bottom: 14px;">
              <div>
                <span style="color: var(--text-muted);">Мощность сигнала:</span><br/>
                <strong id="metric-signal-power" style="font-size: 1.1rem; color: var(--accent-cyan);">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Уровень шума (Шум/Помехи):</span><br/>
                <strong id="metric-noise-level" style="font-size: 1.1rem; color: var(--accent-amber);">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Потеря пакетов (Loss):</span><br/>
                <strong id="metric-packet-loss" style="font-size: 1.1rem; color: var(--accent-red);">-</strong>
              </div>
            </div>

            <div id="media-verdict-banner" style="padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.92rem; font-weight: 600;"></div>
          </div>

          <!-- Кнопка боевого тестирования передачи пакетов -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button class="topo-btn" id="btn-test-transmission" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 12px 20px;">
              🚀 Передать 1000 пакетов Roblox
            </button>
            <div id="test-progress-msg" style="font-family: var(--font-mono); font-size: 0.88rem; font-weight: 700;"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.update();
  }

  bindEvents() {
    this.container.querySelectorAll('[data-media]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.click();
        this.container.querySelectorAll('[data-media]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mediaType = e.target.dataset.media;
        this.update();
      });
    });

    const slider = this.container.querySelector('#cable-dist-slider');
    slider.addEventListener('input', (e) => {
      this.distance = parseInt(e.target.value, 10);
      this.update();
    });

    this.container.querySelector('#btn-toggle-microwave').addEventListener('click', () => {
      sounds.click();
      this.isMicrowaveOn = !this.isMicrowaveOn;
      this.update();
    });

    this.container.querySelector('#btn-toggle-power').addEventListener('click', () => {
      sounds.click();
      this.isPowerCableNear = !this.isPowerCableNear;
      this.update();
    });

    this.container.querySelector('#btn-test-transmission').addEventListener('click', () => {
      this.runTransmissionTest();
    });
  }

  update() {
    this.container.querySelector('#cable-distance-val').textContent = `${this.distance} метров`;

    // Индикатор 100 метров Ethernet
    const badge = this.container.querySelector('#standard-100m-badge');
    if (this.mediaType === 'copper') {
      if (this.distance > 100) {
        badge.textContent = `⚠️ Превышение лимита 100м (+${this.distance - 100}м)! Затухание!`;
        badge.style.background = 'rgba(248, 113, 113, 0.2)';
        badge.style.color = 'var(--accent-red)';
      } else {
        badge.textContent = 'В пределах стандарта (≤100м)';
        badge.style.background = 'rgba(74, 222, 128, 0.15)';
        badge.style.color = 'var(--accent-green)';
      }
    } else if (this.mediaType === 'fiber') {
      badge.textContent = 'Оптоволокно: лимит до 10 000+ метров!';
      badge.style.background = 'rgba(56, 189, 248, 0.15)';
      badge.style.color = 'var(--accent-cyan)';
    } else {
      badge.textContent = 'Wi-Fi: сигнал затухает через стены';
      badge.style.background = 'rgba(251, 191, 36, 0.15)';
      badge.style.color = 'var(--accent-amber)';
    }

    // Статусы кнопок помех
    const mwBtn = this.container.querySelector('#btn-toggle-microwave');
    const mwLabel = this.container.querySelector('#label-microwave-status');
    mwBtn.style.borderColor = this.isMicrowaveOn ? 'var(--accent-amber)' : 'var(--border-color)';
    mwLabel.textContent = this.isMicrowaveOn ? 'ВКЛЮЧЕНА (Изучает помехи 2.45 GHz!)' : 'ВЫКЛ';
    mwLabel.style.color = this.isMicrowaveOn ? 'var(--accent-amber)' : 'var(--text-muted)';

    const pwrBtn = this.container.querySelector('#btn-toggle-power');
    const pwrLabel = this.container.querySelector('#label-power-status');
    pwrBtn.style.borderColor = this.isPowerCableNear ? 'var(--accent-red)' : 'var(--border-color)';
    pwrLabel.textContent = this.isPowerCableNear ? 'ВКЛЮЧЕН (Наводка 50 Hz в упор)' : 'ВЫКЛ (На расстоянии)';
    pwrLabel.style.color = this.isPowerCableNear ? 'var(--accent-red)' : 'var(--text-muted)';

    // Расчет физики затухания и шума
    let power = 100;
    let noise = 0;
    let packetLoss = 0;
    let verdictHtml = '';

    if (this.mediaType === 'copper') {
      // Медь: затухает после 100м
      power = Math.max(10, Math.round(100 - (this.distance * 0.5)));
      if (this.distance > 100) {
        packetLoss += Math.round((this.distance - 100) * 0.8);
      }
      if (this.isPowerCableNear) {
        noise += 35;
        packetLoss += 20;
      }
      if (this.isMicrowaveOn) {
        noise += 10; // витая пара частично экранирована скруткой, помеха слабая
      }

      if (this.distance > 100 || this.isPowerCableNear) {
        verdictHtml = `<span style="color: var(--accent-red);">⚠️ Медный кабель подвержен затуханию и электромагнитной наводке от 220V кабеля. Нарушен лимит 100м!</span>`;
      } else {
        verdictHtml = `<span style="color: var(--accent-green);">✅ Качественный медный линк: скрутка пар гасит синфазные помехи, сигнал устойчив.</span>`;
      }

    } else if (this.mediaType === 'fiber') {
      // Оптика: стекло диэлектрик, помехи = 0, затухание на 150м ничтожно
      power = 99;
      noise = 0;
      packetLoss = 0;
      verdictHtml = `<span style="color: var(--accent-cyan);">💎 Оптоволокно: фотоны света в стекле абсолютно невосприимчивы к радиопомехам, микроволновкам и силовым кабелям!</span>`;

    } else if (this.mediaType === 'wifi') {
      // Wi-Fi: радиоволны в воздухе
      power = Math.max(5, Math.round(100 - (this.distance * 0.75)));
      if (this.isMicrowaveOn) {
        noise += 80;
        packetLoss += 65;
        verdictHtml = `<span style="color: var(--accent-red);">💥 Катастрофа! Микроволновка работает на частоте 2.45 GHz и намертво забивает радиоканал Wi-Fi! Игра вылетает!</span>`;
      } else if (this.distance > 80) {
        packetLoss += 35;
        verdictHtml = `<span style="color: var(--accent-amber);">⚠️ Слабый уровень сигнала Wi-Fi из-за дистанции. Наблюдается высокий сетевой джиттер (пинг скачет).</span>`;
      } else {
        verdictHtml = `<span style="color: var(--accent-green);">✅ Чистый эфир: роутер передает данные на хорошей мощности без радиопомех.</span>`;
      }
    }

    packetLoss = Math.min(100, packetLoss);

    this.container.querySelector('#metric-signal-power').textContent = `${power}%`;
    this.container.querySelector('#metric-noise-level').textContent = `${noise} dBμV`;
    this.container.querySelector('#metric-packet-loss').textContent = `${packetLoss}%`;
    this.container.querySelector('#media-verdict-banner').innerHTML = verdictHtml;
  }

  runTransmissionTest() {
    sounds.packetSend();
    const msg = this.container.querySelector('#test-progress-msg');
    msg.textContent = 'Идет передача 1000 пакетов...';
    msg.style.color = 'var(--accent-cyan)';

    setTimeout(() => {
      const lossEl = this.container.querySelector('#metric-packet-loss');
      const lossPercent = parseInt(lossEl.textContent, 10) || 0;
      const lost = Math.round(1000 * (lossPercent / 100));
      const received = 1000 - lost;

      if (lost === 0) {
        sounds.packetArrive();
        sounds.success();
        msg.textContent = `🎉 Доставлено 1000/1000 пакетов (Потери 0%)! Пинг 2мс, скорость максимальная!`;
        msg.style.color = 'var(--accent-green)';
      } else if (lost < 300) {
        sounds.collision();
        msg.textContent = `⚠️ Доставлено ${received}/1000 пакетов (Потеряно ${lost}). Пинг подскочил, возможны лаги в Roblox!`;
        msg.style.color = 'var(--accent-amber)';
      } else {
        sounds.error();
        sounds.collision();
        msg.textContent = `❌ Сбой канала: потеряно ${lost} пакетов из 1000! Связь с игровым сервером разорвана (Connection Lost).`;
        msg.style.color = 'var(--accent-red)';
      }
    }, 600);
  }
}
