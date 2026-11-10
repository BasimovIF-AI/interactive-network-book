/**
 * SwitchCamLab.js — Интерактивный симулятор обучения CAM-таблицы коммутатора.
 * Показывает механизмы Learning, Forwarding, Filtering и Flooding в реальном времени.
 */

import { sounds } from '../audio/SoundManager.js';
import { SwitchDevice } from '../engine/Device.js';
import { EthernetFrame } from '../engine/Packet.js';

export class SwitchCamLab {
  constructor(container) {
    this.container = container;
    this.switchDevice = new SwitchDevice('sw1', 'Managed Switch L2', 4);
    this.pcs = [
      { id: 'pc1', name: 'PC-1', port: 'Fa0/1', mac: '00:00:00:00:00:01', ip: '192.168.1.10' },
      { id: 'pc2', name: 'PC-2', port: 'Fa0/2', mac: '00:00:00:00:00:02', ip: '192.168.1.20' },
      { id: 'pc3', name: 'PC-3', port: 'Fa0/3', mac: '00:00:00:00:00:03', ip: '192.168.1.30' },
      { id: 'pc4', name: 'PC-4', port: 'Fa0/4', mac: '00:00:00:00:00:04', ip: '192.168.1.40' }
    ];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🔀</span>
            <span class="lab-title">Обучение коммутатора (Switch CAM Table Simulator)</span>
          </div>
          <span class="lab-badge">Лаборатория L2</span>
        </div>
        <div class="lab-body">
          <div class="switch-grid">
            <!-- Левая колонка: Кнопки отправки и визуальная схема -->
            <div>
              <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 12px;">
                Выбери действие и наблюдай, как коммутатор заполняет свою таблицу MAC-адресов:
              </p>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                <button class="topo-btn" id="btn-sw-pc1-to-pc2" style="text-align: left; padding: 10px 14px;">
                  1️⃣ <strong>PC-1 ➔ PC-2</strong> (Первый запрос: Unknown Unicast Flooding)
                </button>
                <button class="topo-btn" id="btn-sw-pc2-reply" style="text-align: left; padding: 10px 14px;">
                  2️⃣ <strong>PC-2 ➔ PC-1</strong> (Ответ: Forward строго в Fa0/1!)
                </button>
                <button class="topo-btn" id="btn-sw-pc3-bcast" style="text-align: left; padding: 10px 14px;">
                  3️⃣ <strong>PC-3 ➔ Broadcast</strong> (Широковещательный кадр)
                </button>
                <button class="topo-btn" id="btn-sw-clear" style="border-color: var(--accent-red); color: var(--accent-red); padding: 8px 14px; margin-top: 6px;">
                  🗑️ Очистить CAM-таблицу (mac address-table clear)
                </button>
              </div>

              <div id="sw-event-log" style="background: var(--bg-surface-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-family: var(--font-mono); font-size: 0.85rem; height: 110px; overflow-y: auto;">
                <div style="color: var(--text-muted);">Готов к работе. CAM-таблица пуста.</div>
              </div>
            </div>

            <!-- Правая колонка: CAM Таблица коммутатора -->
            <div class="cam-table-wrapper">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 0.95rem; color: var(--accent-cyan);">Таблица MAC-адресов (CAM)</strong>
                <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">Записей: <span id="cam-count">0</span></span>
              </div>
              <table class="cam-table">
                <thead>
                  <tr>
                    <th>VLAN</th>
                    <th>MAC-адрес</th>
                    <th>Тип</th>
                    <th>Порт</th>
                  </tr>
                </thead>
                <tbody id="cam-table-body">
                  <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px 0;">
                      Таблица пуста
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateCamView();
  }

  bindEvents() {
    this.container.querySelector('#btn-sw-pc1-to-pc2').addEventListener('click', () => {
      this.sendFrame('pc1', 'pc2');
    });

    this.container.querySelector('#btn-sw-pc2-reply').addEventListener('click', () => {
      this.sendFrame('pc2', 'pc1');
    });

    this.container.querySelector('#btn-sw-pc3-bcast').addEventListener('click', () => {
      this.sendFrame('pc3', 'broadcast');
    });

    this.container.querySelector('#btn-sw-clear').addEventListener('click', () => {
      sounds.click();
      this.switchDevice.camTable.clear();
      this.logEvent('🧹 Таблица MAC-адресов очищена.');
      this.updateCamView();
    });
  }

  sendFrame(fromId, toId) {
    sounds.packetSend();
    const fromPc = this.pcs.find(p => p.id === fromId);
    let toMac = 'FF:FF:FF:FF:FF:FF';
    let toLabel = 'BROADCAST';

    if (toId !== 'broadcast') {
      const toPc = this.pcs.find(p => p.id === toId);
      toMac = toPc.mac;
      toLabel = toPc.name;
    }

    const frame = new EthernetFrame({
      destMac: toMac,
      sourceMac: fromPc.mac,
      etherType: 0x0800
    });

    const isKnown = this.switchDevice.camTable.has(toMac);
    const result = this.switchDevice.processFrame(frame, fromPc.port);

    if (result.action === 'FLOOD') {
      sounds.collision();
      this.logEvent(`📢 [${fromPc.name}] ➔ [${toLabel}]: MAC неизвестен! FLOOD во все порты (${result.outputs.map(o => o.port).join(', ')})`);
    } else if (result.action === 'FORWARD') {
      sounds.packetArrive();
      this.logEvent(`🎯 [${fromPc.name}] ➔ [${toLabel}]: MAC известен в CAM! Пакет направлен СТРОГО в порт ${result.outputs[0].port}`);
    }

    this.updateCamView(fromPc.mac);
  }

  logEvent(msg) {
    const logBox = this.container.querySelector('#sw-event-log');
    const line = document.createElement('div');
    line.style.marginBottom = '4px';
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.prepend(line);
  }

  updateCamView(highlightMac = null) {
    const tbody = this.container.querySelector('#cam-table-body');
    const countSpan = this.container.querySelector('#cam-count');
    const entries = Array.from(this.switchDevice.camTable.entries());

    countSpan.textContent = entries.length;

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px 0;">
            Таблица пуста
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = entries.map(([mac, entry]) => {
      const isNew = mac === highlightMac;
      return `
        <tr class="${isNew ? 'new-entry' : ''}">
          <td><span style="color: var(--accent-cyan); font-weight: 700;">${entry.vlanId}</span></td>
          <td style="font-weight: 600;">${mac}</td>
          <td style="color: var(--text-muted);">DYNAMIC</td>
          <td><strong style="color: var(--accent-green);">${entry.port}</strong></td>
        </tr>
      `;
    }).join('');
  }
}
