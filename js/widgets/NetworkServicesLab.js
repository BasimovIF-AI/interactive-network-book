/**
 * NetworkServicesLab.js — Интерактивная лаборатория ключевых сервисов (ARP, DNS, NAT/PAT).
 */

import { sounds } from '../audio/SoundManager.js';

export class NetworkServicesLab {
  constructor(container) {
    this.container = container;
    this.currentTab = 'arp';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🛠️</span>
            <span class="lab-title">Сетевые службы: Интерактивный симулятор ARP, DNS и NAT</span>
          </div>
          <span class="lab-badge">Лаборатория L3-L7</span>
        </div>
        <div class="lab-body">
          <!-- Вкладки сервисов -->
          <div class="topo-controls" style="margin-bottom: 20px;">
            <button class="topo-btn active" data-tab="arp">🔍 Служба ARP (Поиск MAC)</button>
            <button class="topo-btn" data-tab="dns">🌲 Служба DNS (Дерево серверов)</button>
            <button class="topo-btn" data-tab="nat">🎭 Служба NAT/PAT (Трансляция IP)</button>
          </div>

          <div id="service-tab-content"></div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderTab('arp');
  }

  bindEvents() {
    this.container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.click();
        this.container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderTab(e.target.dataset.tab);
      });
    });
  }

  renderTab(tab) {
    this.currentTab = tab;
    const content = this.container.querySelector('#service-tab-content');

    if (tab === 'arp') {
      content.innerHTML = `
        <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 14px;">
          ARP (Address Resolution Protocol) решает главную загадку: мы знаем IP-адрес друга в локалке, но сетевая карта требует MAC-адрес!
        </p>
        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <button class="topo-btn" id="btn-arp-query" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 18px;">
            📢 Запустить ARP Who-has 192.168.1.5?
          </button>
        </div>
        <div id="arp-interactive-area" style="background: var(--bg-surface-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; font-family: var(--font-mono); font-size: 0.88rem;">
          <div>Таблица ARP (arp -a) пуста. Нажми кнопку для запуска широковещательного запроса.</div>
        </div>
      `;

      content.querySelector('#btn-arp-query').addEventListener('click', () => {
        sounds.packetSend();
        const area = content.querySelector('#arp-interactive-area');
        area.innerHTML = `
          <div style="color: var(--accent-cyan);">[Шаг 1] ПК-1 отправляет BROADCAST: «Эй, все в сети! Чей это IP 192.168.1.5? Сообщите 192.168.1.10!»</div>
          <div style="color: var(--text-muted); margin-top: 6px;">[Шаг 2] ПК-2, ПК-3 видят, что IP не их, и молча отбрасывают запрос.</div>
        `;

        setTimeout(() => {
          sounds.packetArrive();
          sounds.success();
          area.innerHTML += `
            <div style="color: var(--accent-green); margin-top: 6px;">[Шаг 3] ПК-5 узнал свой IP и шлет UNICAST ответ: «Это я! Мой MAC 00:0C:29:4F:8A:12»</div>
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
              <strong>Кэш ARP обновлен (arp -a):</strong><br/>
              Internet Address &nbsp;&nbsp;&nbsp; Physical Address &nbsp;&nbsp;&nbsp; Type<br/>
              192.168.1.5 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00-0c-29-4f-8a-12 &nbsp;&nbsp; dynamic
            </div>
          `;
        }, 800);
      });

    } else if (tab === 'dns') {
      content.innerHTML = `
        <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 14px;">
          DNS превращает понятные нам имена сайтов в цифровые IP-адреса через иерархическую цепочку серверов:
        </p>
        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <input type="text" id="dns-input-domain" value="play.minecraft.net" 
            style="padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-surface-card); color: var(--text-main); font-family: var(--font-mono); font-size: 0.95rem; flex: 1;" />
          <button class="topo-btn" id="btn-dns-lookup" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 18px;">
            🔍 Найти IP
          </button>
        </div>
        <div id="dns-flow-box" style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 0.85rem;">
          <div style="color: var(--text-muted);">Нажми «Найти IP», чтобы проследить путь DNS-рекурсии.</div>
        </div>
      `;

      content.querySelector('#btn-dns-lookup').addEventListener('click', () => {
        sounds.packetSend();
        const flow = content.querySelector('#dns-flow-box');
        const domain = content.querySelector('#dns-input-domain').value;

        flow.innerHTML = `
          <div style="background: var(--bg-surface-card); padding: 10px; border-radius: 6px;">
            1️⃣ <strong>Локальный DNS-резолвер (8.8.8.8):</strong> «Спрашиваю у Корневого сервера (.): Кто отвечает за зону <strong>.net</strong>?»
          </div>
        `;

        setTimeout(() => {
          sounds.click();
          flow.innerHTML += `
            <div style="background: var(--bg-surface-card); padding: 10px; border-radius: 6px;">
              2️⃣ <strong>Корневой сервер:</strong> «Иди к серверам TLD для зоны <strong>.net</strong> (a.gtld-servers.net).»
            </div>
          `;
        }, 500);

        setTimeout(() => {
          sounds.click();
          flow.innerHTML += `
            <div style="background: var(--bg-surface-card); padding: 10px; border-radius: 6px;">
              3️⃣ <strong>TLD-сервер .net:</strong> «Авторитетный сервер для домена <strong>minecraft.net</strong> — это ns1.p201.dynect.net.»
            </div>
          `;
        }, 1000);

        setTimeout(() => {
          sounds.packetArrive();
          sounds.success();
          flow.innerHTML += `
            <div style="background: rgba(74, 222, 128, 0.15); border: 1px solid var(--accent-green); padding: 10px; border-radius: 6px; color: var(--accent-green);">
              🎉 4️⃣ <strong>Авторитетный сервер:</strong> «Запись A для <strong>${domain}</strong> найдена: <strong>13.107.246.10</strong>!» Браузер открывает соединение!
            </div>
          `;
        }, 1500);
      });

    } else if (tab === 'nat') {
      content.innerHTML = `
        <p style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 14px;">
          NAT/PAT (Port Address Translation) позволяет сотням домашних гаджетов с серыми IP выходить в глобальную сеть через один белый IP провайдера:
        </p>
        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <button class="topo-btn" id="btn-nat-phone" style="padding: 10px 14px;">📱 Смартфон открывает YouTube</button>
          <button class="topo-btn" id="btn-nat-pc" style="padding: 10px 14px;">💻 Ноутбук открывает Discord</button>
          <button class="topo-btn" id="btn-nat-console" style="padding: 10px 14px;">🎮 Консоль подключается к серверу</button>
        </div>
        <div class="cam-table-wrapper">
          <div style="font-weight: 700; font-size: 0.92rem; color: var(--accent-cyan); margin-bottom: 8px;">
            Таблица трансляции роутера (NAT Translation Table):
          </div>
          <table class="cam-table">
            <thead>
              <tr>
                <th>Внутренний сокет (Inside Local)</th>
                <th>Публичный сокет (Inside Global)</th>
                <th>Назначение (Outside Global)</th>
              </tr>
            </thead>
            <tbody id="nat-table-body">
              <tr>
                <td>192.168.1.10 : 51234</td>
                <td><strong style="color: var(--accent-cyan);">95.173.136.42 : 40001</strong></td>
                <td>142.250.180.206 : 443</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      let portCounter = 40002;
      const addNatRow = (devName, ip, port, dest) => {
        sounds.packetSend();
        const tbody = content.querySelector('#nat-table-body');
        const tr = document.createElement('tr');
        tr.className = 'new-entry';
        tr.innerHTML = `
          <td>${ip} : ${port} (${devName})</td>
          <td><strong style="color: var(--accent-cyan);">95.173.136.42 : ${portCounter++}</strong></td>
          <td>${dest}</td>
        `;
        tbody.prepend(tr);
        sounds.packetArrive();
      };

      content.querySelector('#btn-nat-phone').addEventListener('click', () => {
        addNatRow('Смартфон', '192.168.1.15', Math.floor(50000 + Math.random() * 5000), '142.250.180.14 : 443 (YouTube)');
      });
      content.querySelector('#btn-nat-pc').addEventListener('click', () => {
        addNatRow('Ноутбук', '192.168.1.22', Math.floor(50000 + Math.random() * 5000), '162.159.130.233 : 443 (Discord)');
      });
      content.querySelector('#btn-nat-console').addEventListener('click', () => {
        addNatRow('Консоль', '192.168.1.80', Math.floor(50000 + Math.random() * 5000), '52.12.80.12 : 25565 (Game Server)');
      });
    }
  }
}
