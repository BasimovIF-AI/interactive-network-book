/**
 * RouterCompass.js — Интерактивный симулятор маршрутизатора (Longest Prefix Match & MAC Rewrite).
 * Показывает, как роутер принимает решения по таблице маршрутизации и переписывает заголовки L2.
 */

import { sounds } from '../audio/SoundManager.js';
import { BitMath } from '../engine/BitMath.js';
import { RouterDevice } from '../engine/Device.js';
import { EthernetFrame, IPv4Packet } from '../engine/Packet.js';

export class RouterCompass {
  constructor(container) {
    this.container = container;
    this.router = new RouterDevice('r1', 'Enterprise Edge Router');
    this.initRouter();
    this.render();
  }

  initRouter() {
    this.router.addInterface({ name: 'Gig0/0', mac: '02:00:AA:00:00:01', ip: '192.168.1.1', cidr: 24 });
    this.router.addInterface({ name: 'Gig0/1', mac: '02:00:BB:00:00:01', ip: '172.16.1.1', cidr: 24 });
    this.router.addInterface({ name: 'Serial0/0', mac: '02:00:CC:00:00:01', ip: '10.0.0.1', cidr: 30 });

    // Маршруты
    this.router.addRoute('192.168.1.0', 24, null, 'Gig0/0');
    this.router.addRoute('172.16.1.0', 24, null, 'Gig0/1');
    this.router.addRoute('10.0.0.0', 30, null, 'Serial0/0');
    this.router.addRoute('172.16.1.128', 26, null, 'Gig0/1'); // более специфичный маршрут для демонстрации LPM
    this.router.addRoute('0.0.0.0', 0, '10.0.0.2', 'Serial0/0'); // Маршрут по умолчанию (Default Route)
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🧭</span>
            <span class="lab-title">Маршрутный компас: Longest Prefix Match и MAC Rewrite</span>
          </div>
          <span class="lab-badge">Лаборатория L3</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 14px;">
            Введи IP-адрес назначения и нажми «Маршрутизировать». Роутер найдет самое точное совпадение (LPM) и перепишет L2 MAC-заголовок!
          </p>

          <div style="display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;">
            <input type="text" id="dest-ip-input" value="172.16.1.140" placeholder="Например: 172.16.1.140"
              style="padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-surface-card); color: var(--text-main); font-family: var(--font-mono); font-size: 1rem; flex: 1; min-width: 200px;" />
            <button class="topo-btn" id="btn-route-packet" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 20px;">
              ⚡ Направить пакет
            </button>
            <button class="topo-btn" id="btn-preset-default" style="padding: 10px 14px;">
              Интернет (8.8.8.8)
            </button>
          </div>

          <!-- Таблица маршрутизации -->
          <div class="cam-table-wrapper" style="margin-bottom: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; color: var(--accent-cyan);">
              Таблица маршрутизации роутера (Routing Table):
            </div>
            <table class="cam-table">
              <thead>
                <tr>
                  <th>Сеть назначения</th>
                  <th>Префикс</th>
                  <th>Интерфейс</th>
                  <th>Следующий хоп (Next Hop)</th>
                </tr>
              </thead>
              <tbody id="routes-table-body"></tbody>
            </table>
          </div>

          <!-- Результат обработки пакета -->
          <div id="route-result-box" style="display: none; background: var(--bg-surface-card); border-left: 4px solid var(--accent-green); border-radius: 0 var(--radius-md) var(--radius-md) 0; padding: 16px;">
            <div style="font-weight: 700; font-size: 1rem; color: var(--accent-green); margin-bottom: 8px;">
              ✅ Пакет успешно смаршрутизирован!
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.88rem; line-height: 1.6;" id="route-verdict-text"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderRoutesTable();
  }

  bindEvents() {
    this.container.querySelector('#btn-route-packet').addEventListener('click', () => {
      this.processDestIp();
    });

    this.container.querySelector('#btn-preset-default').addEventListener('click', () => {
      this.container.querySelector('#dest-ip-input').value = '8.8.8.8';
      this.processDestIp();
    });
  }

  renderRoutesTable(matchedRoute = null) {
    const tbody = this.container.querySelector('#routes-table-body');
    tbody.innerHTML = this.router.routingTable.map(r => {
      const isMatch = matchedRoute && matchedRoute.networkIp === r.networkIp && matchedRoute.cidr === r.cidr;
      return `
        <tr style="${isMatch ? 'background: rgba(56, 189, 248, 0.2); font-weight: 700;' : ''}">
          <td style="color: ${isMatch ? 'var(--accent-cyan)' : 'inherit'};">${r.networkIp}</td>
          <td><span class="badge" style="background: var(--bg-surface); padding: 2px 6px; border-radius: 4px;">/${r.cidr}</span></td>
          <td><strong style="color: var(--accent-green);">${r.ifaceName}</strong></td>
          <td style="color: var(--text-muted);">${r.nextHop || 'Directly Connected'}</td>
        </tr>
      `;
    }).join('');
  }

  processDestIp() {
    const ipStr = this.container.querySelector('#dest-ip-input').value.trim();
    try {
      BitMath.ipToLong(ipStr);
    } catch {
      sounds.error();
      alert('Пожалуйста, введи корректный IPv4-адрес, например 172.16.1.140');
      return;
    }

    sounds.packetSend();
    const route = this.router.lookupRoute(ipStr);
    this.renderRoutesTable(route);

    const resBox = this.container.querySelector('#route-result-box');
    const verdict = this.container.querySelector('#route-verdict-text');
    resBox.style.display = 'block';

    if (!route) {
      sounds.error();
      resBox.style.borderLeftColor = 'var(--accent-red)';
      verdict.innerHTML = `<span style="color: var(--accent-red);">Сеть недостижима (Destination Host Unreachable).</span>`;
      return;
    }

    sounds.packetArrive();
    resBox.style.borderLeftColor = 'var(--accent-green)';

    const isDefault = route.cidr === 0;
    const outIface = this.router.getInterface(route.ifaceName);

    verdict.innerHTML = `
      <div>🎯 <strong>Правило:</strong> ${isDefault ? 'Сработал шлюз по умолчанию (Default Route 0.0.0.0/0)' : `Найдено совпадение по правилу <strong>${route.networkIp}/${route.cidr}</strong> (LPM)`}</div>
      <div>🚪 <strong>Выходной порт:</strong> <span style="color: var(--accent-green);">${route.ifaceName}</span> (MAC роутера: ${outIface.mac})</div>
      <div>⏳ <strong>Поле TTL:</strong> уменьшено с 64 до 63 (защита от вечных циклов)</div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
        🔄 <strong>Секрет L2 MAC Rewrite:</strong><br/>
        • Исходный IP отправителя и IP получателя (${ipStr}) <strong>НЕ ИЗМЕНИЛИСЬ</strong>!<br/>
        • Но MAC-заголовок кадра переписан заново: Source MAC стал <strong>${outIface.mac}</strong>, а Dest MAC стал адресом следующего узла!
      </div>
    `;
  }
}
