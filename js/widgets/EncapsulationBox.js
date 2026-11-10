/**
 * EncapsulationBox.js — Интерактивный упаковщик «Сетевая матрёшка» (Инкапсуляция и Декапсуляция).
 * Показывает, как сообщение обрастает заголовками от 7-го уровня OSI до физических битов.
 */

import { sounds } from '../audio/SoundManager.js';

export class EncapsulationBox {
  constructor(container) {
    this.container = container;
    this.step = 0; // 0 = только данные, 1 = L4 TCP, 2 = L3 IP, 3 = L2 Frame, 4 = L1 Bits
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">📦</span>
            <span class="lab-title">Упаковщик «Сетевая матрёшка»: Инкапсуляция PDU</span>
          </div>
          <span class="lab-badge">Лаборатория L2-L4</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 16px;">
            Введи сообщение и нажимай <strong>«Завернуть в следующий слой»</strong>, чтобы увидеть, как каждый уровень модели OSI приклеивает свой служебный заголовок!
          </p>

          <div style="margin-bottom: 16px; display: flex; gap: 10px; align-items: center;">
            <input type="text" id="encap-user-msg" value="Привет из Minecraft!" 
              style="padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-surface-card); color: var(--text-main); font-size: 1rem; flex: 1;" />
            <button class="topo-btn" id="btn-encap-step" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 18px;">
              🎁 Упаковать слой (+1)
            </button>
            <button class="topo-btn" id="btn-encap-reset" style="padding: 10px 14px;">
              ↺ Сброс
            </button>
          </div>

          <!-- Контейнер слоев матрешки -->
          <div class="encap-flow" id="encap-layers-box"></div>

          <div id="encap-status-banner" style="margin-top: 16px; padding: 12px 16px; border-radius: var(--radius-sm); background: var(--bg-surface-card); font-family: var(--font-mono); font-size: 0.9rem;">
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
        // Декапсуляция (распаковка)
        this.step = 0;
        sounds.success();
      }
      this.updateLayers();
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
      btn.textContent = '🚀 Отправить и распаковать (Декапсуляция)';
      btn.style.background = 'var(--accent-green)';
    } else {
      btn.textContent = `🎁 Завернуть в слой (${this.step + 1}/4)`;
      btn.style.background = 'var(--accent-cyan)';
    }

    let html = '';

    // L1: Физические биты
    if (this.step >= 4) {
      const bitsSample = '10101011 00110001 11010110 01101111 11110000 10100101...';
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-amber); background: rgba(251, 191, 36, 0.08);">
          <span class="layer-header-tag" style="background: var(--accent-amber); color: #000;">1. Физический уровень (L1 Bits)</span>
          <div style="font-family: var(--font-mono); color: var(--accent-amber); font-weight: 700; word-break: break-all;">
            ⚡ Электрические импульсы в витой паре: ${bitsSample}
          </div>
      `;
    }

    // L2: Ethernet Кадр
    if (this.step >= 3) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-purple); background: rgba(167, 139, 250, 0.08); margin-top: 8px;">
          <span class="layer-header-tag" style="background: var(--accent-purple); color: #fff;">2. Канальный уровень (L2 Frame)</span>
          <div style="display: flex; gap: 10px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">MAC-Dest: 00:1A:2B:3C:4D:5E</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">MAC-Src: 00:AA:BB:CC:DD:EE</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Type: 0x0800 (IPv4)</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">FCS: 0x8F3A2B1C</span>
          </div>
      `;
    }

    // L3: IPv4 Пакет
    if (this.step >= 2) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-cyan); background: rgba(56, 189, 248, 0.08); margin-top: 8px;">
          <span class="layer-header-tag" style="background: var(--accent-cyan); color: #000;">3. Сетевой уровень (L3 Packet)</span>
          <div style="display: flex; gap: 10px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Src-IP: 192.168.1.15</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Dest-IP: 142.250.180.206</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">TTL: 64</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Protocol: 6 (TCP)</span>
          </div>
      `;
    }

    // L4: TCP Сегмент
    if (this.step >= 1) {
      html += `
        <div class="encap-layer packed" style="border-color: var(--accent-green); background: rgba(74, 222, 128, 0.08); margin-top: 8px;">
          <span class="layer-header-tag" style="background: var(--accent-green); color: #000;">4. Транспортный уровень (L4 Segment)</span>
          <div style="display: flex; gap: 10px; font-size: 0.82rem; font-family: var(--font-mono); margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Src-Port: 54321</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Dest-Port: 80 (HTTP)</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Seq: 101</span>
            <span style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">Flags: [ACK, PSH]</span>
          </div>
      `;
    }

    // Данные (Payload)
    html += `
      <div class="encap-layer" style="border-color: var(--border-color); background: var(--bg-surface); margin-top: 8px;">
        <span class="layer-header-tag" style="background: var(--text-muted); color: #fff;">7. Данные приложения (L7 Payload)</span>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-cyan); padding: 4px 0;">
          💬 "${msg}"
        </div>
      </div>
    `;

    // Закрывающие теги вложенности
    if (this.step >= 1) html += `</div>`;
    if (this.step >= 2) html += `</div>`;
    if (this.step >= 3) html += `</div>`;
    if (this.step >= 4) html += `</div>`;

    box.innerHTML = html;

    const descriptions = [
      'Уровень 7 (Данные): Чистый текст сообщения, созданный в программе.',
      'Уровень 4 (Сегмент): Добавлены порты отправителя и получателя (TCP-коробка).',
      'Уровень 3 (Пакет): Наклеена бирка с IP-адресами источника и назначения.',
      'Уровень 2 (Кадр / Frame): Добавлены MAC-адреса локальных соседей и контрольная сумма FCS.',
      'Уровень 1 (Биты): Весь пирог конвертирован в последовательность нулей и единиц для провода!'
    ];
    banner.textContent = descriptions[this.step];
  }
}
