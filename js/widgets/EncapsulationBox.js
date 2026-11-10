/**
 * EncapsulationBox.js — Интерактивный упаковщик «Сетевая матрёшка 2.0» (Инкапсуляция и Декапсуляция).
 * Показывает реальные поля заголовков (Header) и трейлера (Trailer FCS с контрольной суммой CRC32).
 * Включает режим эмуляции помехи и отбраковки поврежденного кадра на приёмнике.
 */

import { sounds } from '../audio/SoundManager.js';

export class EncapsulationBox {
  constructor(container) {
    this.container = container;
    this.step = 0; // 0 = данные, 1 = L4 TCP, 2 = L3 IP, 3 = L2 Frame + CRC, 4 = L1 Bits
    this.isNoiseActive = false;
    this.render();
  }

  calculateCrc32(str) {
    // Детерминированный расчет CRC32 для наглядности
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ ((crc ^ str.charCodeAt(i)) & 0xFF);
    }
    return '0x' + ((crc ^ (-1)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🪆</span>
            <span class="lab-title">Сетевая матрёшка 2.0: Инкапсуляция PDU, Заголовки и Контрольная сумма FCS</span>
          </div>
          <span class="lab-badge">Лаборатория L1-L7</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 14px;">
            Введи сообщение и нажимай <strong>«Завернуть в следующий слой»</strong>. Посмотри, как каждый уровень добавляет служебный заголовок (Header), а канальный уровень L2 — контрольную сумму (Trailer)!
          </p>

          <div style="margin-bottom: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="encap-user-msg" value="Привет, сервер игры!" 
              style="padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-surface-card); color: var(--text-main); font-size: 1rem; flex: 1; min-width: 200px;" />
            <button class="topo-btn" id="btn-encap-step" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 18px;">
              🎁 Упаковать слой (1/4)
            </button>
            <button class="topo-btn" id="btn-toggle-noise" style="padding: 10px 14px;">
              ⚡ Помеха в проводе (Бит-флип): ВЫКЛ
            </button>
            <button class="topo-btn" id="btn-encap-reset" style="padding: 10px 14px;">
              ↺ Сброс
            </button>
          </div>

          <!-- Контейнер слоев матрешки -->
          <div class="encap-flow" id="encap-layers-box"></div>

          <div id="encap-status-banner" style="margin-top: 16px; padding: 14px 18px; border-radius: var(--radius-sm); background: var(--bg-surface-card); font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.5;">
            Уровень: Приложение (L7 Data)
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateLayers();
  }

  bindEvents() {
    this.container.querySelector('#btn-encap-step').addEventListener('click', () => {
      if (this.step < 4) {
        this.step++;
        sounds.packetSend();
      } else {
        // Запуск передачи и декапсуляция
        this.simulateReception();
      }
      this.updateLayers();
    });

    this.container.querySelector('#btn-toggle-noise').addEventListener('click', (e) => {
      sounds.click();
      this.isNoiseActive = !this.isNoiseActive;
      e.target.textContent = `⚡ Помеха в проводе (Бит-флип): ${this.isNoiseActive ? 'ВКЛ 🛑' : 'ВЫКЛ'}`;
      e.target.style.borderColor = this.isNoiseActive ? 'var(--accent-red)' : 'var(--border-color)';
      e.target.style.color = this.isNoiseActive ? 'var(--accent-red)' : 'var(--text-main)';
    });

    this.container.querySelector('#btn-encap-reset').addEventListener('click', () => {
      sounds.click();
      this.step = 0;
      this.updateLayers();
    });

    this.container.querySelector('#encap-user-msg').addEventListener('input', () => {
      this.updateLayers();
    });
  }

  updateLayers() {
    const box = this.container.querySelector('#encap-layers-box');
    const msg = this.container.querySelector('#encap-user-msg').value || 'Данные';
    const btn = this.container.querySelector('#btn-encap-step');
    const banner = this.container.querySelector('#encap-status-banner');

    if (this.step === 4) {
      btn.textContent = '🚀 Отправить по проводу и распаковать на сервере';
      btn.style.background = 'var(--accent-green)';
    } else {
      btn.textContent = `🎁 Завернуть в слой (${this.step + 1}/4)`;
      btn.style.background = 'var(--accent-cyan)';
    }

    const crc = this.calculateCrc32(msg + 'TCP443IP192168');

    let html = '';

    // L1: Физические биты
    if (this.step >= 4) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-amber); background: rgba(251, 191, 36, 0.08);">
          <span class="layer-header-tag" style="background: var(--accent-amber); color: #000;">
            1. Физический уровень (L1 Bits PDU)
          </span>
          <div style="font-family: var(--font-mono); color: var(--accent-amber); font-weight: 700; word-break: break-all; margin-bottom: 8px;">
            ⚡ Электрические импульсы в проводе: 11010010 01101011 00110001 11110000 10101010...
          </div>
      `;
    }

    // L2: Ethernet Кадр (Header + Payload + Trailer)
    if (this.step >= 3) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-purple); background: rgba(167, 139, 250, 0.08); margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="layer-header-tag" style="background: var(--accent-purple); color: #fff;">
              2. Канальный уровень: Кадр (L2 Frame PDU)
            </span>
            <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--accent-purple); font-weight: 700;">
              Header + Trailer FCS
            </span>
          </div>
          <div style="display: flex; gap: 8px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              MAC-Src: 00:1A:2B:3C:4D:5E
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              MAC-Dest: 00:AA:BB:CC:DD:EE
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              EtherType: 0x0800 (IPv4)
            </span>
            <span style="background: rgba(167, 139, 250, 0.2); color: var(--accent-purple); padding: 3px 8px; border-radius: 4px; font-weight: 700;">
              Трейлер FCS (CRC32): ${crc}
            </span>
          </div>
      `;
    }

    // L3: IPv4 Пакет
    if (this.step >= 2) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-cyan); background: rgba(56, 189, 248, 0.08); margin-top: 8px;">
          <span class="layer-header-tag" style="background: var(--accent-cyan); color: #000;">
            3. Сетевой уровень: Пакет (L3 Packet PDU)
          </span>
          <div style="display: flex; gap: 8px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Src-IP: 192.168.1.15
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Dest-IP: 142.250.180.206
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Protocol: 6 (TCP)
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              TTL: 64
            </span>
          </div>
      `;
    }

    // L4: TCP Сегмент
    if (this.step >= 1) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-green); background: rgba(74, 222, 128, 0.08); margin-top: 8px;">
          <span class="layer-header-tag" style="background: var(--accent-green); color: #000;">
            4. Транспортный уровень: Сегмент (L4 Segment PDU)
          </span>
          <div style="display: flex; gap: 8px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Src-Port: 51234
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Dest-Port: 443 (HTTPS)
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Seq: 100
            </span>
            <span style="background: var(--bg-surface); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
              Flags: [ACK, PSH]
            </span>
          </div>
      `;
    }

    // Данные (Payload) L7
    html += `
      <div class="encap-layer" style="border-color: var(--border-color); background: var(--bg-surface); margin-top: 8px;">
        <span class="layer-header-tag" style="background: var(--text-muted); color: #fff;">
          7. Прикладные данные (L7 Data / Payload)
        </span>
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-cyan); padding: 6px 0;">
          💬 "${msg}"
        </div>
      </div>
    `;

    // Закрывающие теги
    if (this.step >= 1) html += `</div>`;
    if (this.step >= 2) html += `</div>`;
    if (this.step >= 3) html += `</div>`;
    if (this.step >= 4) html += `</div>`;

    box.innerHTML = html;

    const descriptions = [
      'Уровень 7 (Данные): Чистый текст сообщения, созданный в программе.',
      'Уровень 4 (Сегмент): Добавлены порты отправителя и получателя (TCP-коробка с номерами комнат).',
      'Уровень 3 (Пакет): Наклеена бирка с IP-адресами источника и назначения (маршрут по планете).',
      'Уровень 2 (Кадр / Frame): Добавлен заголовок с MAC-адресами соседей и ТРЕЙЛЕР FCS (контрольная сумма CRC32)!',
      'Уровень 1 (Биты): Весь слоеный пирог преобразован в поток электрических импульсов для кабеля!'
    ];
    banner.textContent = descriptions[this.step];
  }

  simulateReception() {
    const banner = this.container.querySelector('#encap-status-banner');
    const msg = this.container.querySelector('#encap-user-msg').value || 'Данные';

    sounds.packetSend();
    banner.innerHTML = `<span style="color: var(--accent-cyan);">⚡ Пакет летит по проводу к серверу...</span>`;

    setTimeout(() => {
      if (this.isNoiseActive) {
        sounds.collision();
        sounds.error();
        banner.innerHTML = `
          <div style="color: var(--accent-red); font-weight: 700;">
            💥 ОШИБКА CRC32! В проводе проскочила электромагнитная помеха, один бит исказился!
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
            Сетевая карта сервера пересчитала контрольную сумму FCS: она не совпала с трейлером кадра. 
            <strong>Кадр немедленно отброшен (Frame Dropped)!</strong> Данные защищены от искажения.
          </div>
        `;
      } else {
        sounds.packetArrive();
        sounds.success();
        banner.innerHTML = `
          <div style="color: var(--accent-green); font-weight: 700;">
            🎉 УСПЕХ! Кадр принят сервером, контрольная сумма CRC32 сошлась на 100%!
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
            Декапсуляция: L2 Ethernet сброшен ➔ L3 IP проверен ➔ L4 TCP открыл порт 443 ➔ Чистые данные <strong>"${msg}"</strong> переданы веб-серверу!
          </div>
        `;
        this.step = 0;
      }
    }, 700);
  }
}
