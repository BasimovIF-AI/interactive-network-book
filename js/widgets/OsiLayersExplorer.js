/**
 * OsiLayersExplorer.js — Интерактивный рентген моделей OSI и стека TCP/IP.
 * Позволяет кликать по любому уровню, сравнивать 7 уровней OSI и 4 уровня TCP/IP,
 * видеть протоколы, единицы данных (PDU), устройства и аналогии.
 */

import { sounds } from '../audio/SoundManager.js';

const LAYERS_INFO = [
  {
    osiNum: 7,
    osiName: 'Прикладной (Application)',
    tcpIpLayer: 'Уровень приложений (Application)',
    pdu: 'Данные (Data / Message)',
    devices: 'ПК, Смартфон, Игровой сервер, Браузер',
    protocols: 'HTTP, HTTPS, DNS, Discord Voice, протокол Roblox',
    color: '#38bdf8',
    summary: 'Интерфейс между твоей программой и сетью. Именно здесь рождается сообщение чата или запрос на загрузку карты в игре.',
    analogy: 'Шеф-повар ресторана, который готовит конкретное блюдо по твоему заказу.'
  },
  {
    osiNum: 6,
    osiName: 'Представления (Presentation)',
    tcpIpLayer: 'Уровень приложений (Application)',
    pdu: 'Данные (Data)',
    devices: 'Операционная система, Криптографический модуль',
    protocols: 'TLS / SSL (шифрование), UTF-8, JPEG, PNG, MP4, Gzip (сжатие)',
    color: '#06b6d4',
    summary: 'Переводчик и шифровальщик. Превращает данные программы в понятный всем формат, сжимает трафик и шифрует пароли.',
    analogy: 'Переводчик-дипломат, который переводит твою записку на французский язык и запечатывает её в сургучную печать шифра.'
  },
  {
    osiNum: 5,
    osiName: 'Сеансовый (Session)',
    tcpIpLayer: 'Уровень приложений (Application)',
    pdu: 'Данные (Data)',
    devices: 'Операционная система, Сетевой стек сокетов',
    protocols: 'RPC, NetBIOS, сессии WebSocket, чекпоинты потоков',
    color: '#0ea5e9',
    summary: 'Регулировщик беседы. Открывает, держит и закрывает сессию связи. Ставит контрольные точки при скачивании больших файлов.',
    analogy: 'Диспетчер телефонной станции, который соединяет абонентов, следит, чтобы связь не оборвалась, и вешает трубку в конце.'
  },
  {
    osiNum: 4,
    osiName: 'Транспортный (Transport)',
    tcpIpLayer: 'Транспортный уровень (Transport)',
    pdu: 'Сегмент (TCP) / Датаграмма (UDP)',
    devices: 'Сетевой стек операционной системы, Брандмауэр',
    protocols: 'TCP (надежный с распиской), UDP (быстрый без расписки)',
    color: '#4ade80',
    summary: 'Курьерская служба доставки. Отвечает за номера портов (кому отдать данные на компьютере) и проверку того, все ли куски долетели.',
    analogy: 'Бригада курьеров с номерами комнат получателей: один везет документы под роспись (TCP), второй бросает пиццу на бегу (UDP).'
  },
  {
    osiNum: 3,
    osiName: 'Сетевой (Network)',
    tcpIpLayer: 'Межсетевой уровень (Internet)',
    pdu: 'Пакет (Packet)',
    devices: 'Маршрутизатор (Router), L3-коммутатор',
    protocols: 'IPv4, IPv6, ICMP (Ping), OSPF, BGP',
    color: '#fbbf24',
    summary: 'Всемирный навигатор. Оперирует IP-адресами, строит карту планеты и находит самый выгодный маршрут через 15 стран.',
    analogy: 'Международная служба логистики с навигатором, рассчитывающая путь почтового грузовика через города и трассы.'
  },
  {
    osiNum: 2,
    osiName: 'Канальный (Data Link)',
    tcpIpLayer: 'Уровень сетевого доступа (Network Access)',
    pdu: 'Кадр (Frame)',
    devices: 'Коммутатор (Switch), Сетевая карта (NIC), Wi-Fi точка доступа',
    protocols: 'Ethernet (802.3), Wi-Fi (802.11), MAC-адреса, ARP, VLAN',
    color: '#a78bfa',
    summary: 'Локальный перевозчик от одного кабеля до другого. Использует неизменные MAC-адреса сетевых плат и проверяет ошибки контрольной суммой FCS.',
    analogy: 'Грузовик службы доставки с конкретным номером машины, который везет посылку по конкретной улице от склада к двери.'
  },
  {
    osiNum: 1,
    osiName: 'Физический (Physical)',
    tcpIpLayer: 'Уровень сетевого доступа (Network Access)',
    pdu: 'Биты (Bits: 0 и 1)',
    devices: 'Кабель витая пара, Оптоволокно, Разъем RJ-45, Радиоантенна',
    protocols: '1000BASE-T, V.90, радиомодуляция QAM, лазерные импульсы',
    color: '#f87171',
    summary: 'Реальный материальный мир. Напряжение в медных жилах, вспышки фотонов в стекле и радиоволны в воздухе.',
    analogy: 'Асфальт дороги и рельсы, по которым физически катятся колеса машин и поездов.'
  }
];

export class OsiLayersExplorer {
  constructor(container) {
    this.container = container;
    this.selectedLayerIndex = 0; // 0 = L7 (Application)
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🔬</span>
            <span class="lab-title">Рентген сетевых моделей: 7 уровней OSI против 4 уровней TCP/IP</span>
          </div>
          <span class="lab-badge">Модели L1-L7</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 16px;">
            Кликай по этажам модели OSI или TCP/IP, чтобы увидеть, какие протоколы там живут, какими устройствами они управляются и какую роль играют в реальной жизни:
          </p>

          <div style="display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start;">
            <!-- Левая колонка: Интерактивный стек уровней -->
            <div id="osi-stack-col" style="display: flex; flex-direction: column; gap: 6px;"></div>

            <!-- Правая колонка: Карточка детальной информации -->
            <div id="layer-detail-card" style="
              background: var(--bg-surface-card);
              border: 1px solid var(--border-color);
              border-radius: var(--radius-md);
              padding: 22px;
              min-height: 380px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;">
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderStack();
    this.showLayerDetails(this.selectedLayerIndex);
  }

  renderStack() {
    const col = this.container.querySelector('#osi-stack-col');
    col.innerHTML = '';

    LAYERS_INFO.forEach((layer, idx) => {
      const btn = document.createElement('div');
      btn.className = `osi-layer-row ${idx === this.selectedLayerIndex ? 'active' : ''}`;
      btn.style.cssText = `
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        border: 2px solid ${idx === this.selectedLayerIndex ? layer.color : 'var(--border-color)'};
        background: ${idx === this.selectedLayerIndex ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface-card)'};
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.15s ease;
      `;

      btn.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px; height: 24px; border-radius: 50%;
            background: ${layer.color}; color: #000;
            font-weight: 800; font-size: 0.8rem;
            display: flex; align-items: center; justify-content: center;
            font-family: var(--font-mono);">
            ${layer.osiNum}
          </span>
          <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
            ${layer.osiName.split(' ')[0]}
          </span>
        </div>
        <span style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted);">
          L${layer.osiNum}
        </span>
      `;

      btn.addEventListener('click', () => {
        sounds.click();
        this.selectedLayerIndex = idx;
        this.renderStack();
        this.showLayerDetails(idx);
      });

      col.appendChild(btn);
    });
  }

  showLayerDetails(idx) {
    const layer = LAYERS_INFO[idx];
    const card = this.container.querySelector('#layer-detail-card');
    card.style.borderLeft = `5px solid ${layer.color}`;

    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <span style="font-size: 0.8rem; font-weight: 800; font-family: var(--font-mono); color: ${layer.color}; text-transform: uppercase;">
            Уровень ${layer.osiNum} модели OSI
          </span>
          <span style="font-size: 0.75rem; background: var(--bg-surface); padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border-color); font-family: var(--font-mono);">
            PDU: ${layer.pdu}
          </span>
        </div>

        <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 12px; color: var(--text-main);">
          ${layer.osiName}
        </h3>

        <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px; color: var(--text-main);">
          ${layer.summary}
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem; font-family: var(--font-mono); margin-bottom: 16px;">
          <div style="background: var(--bg-surface); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-size: 0.75rem;">В стеке TCP/IP:</span><br/>
            <strong style="color: ${layer.color};">${layer.tcpIpLayer}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-size: 0.75rem;">Оборудование:</span><br/>
            <strong style="color: var(--text-main);">${layer.devices}</strong>
          </div>
        </div>

        <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 16px;">
          <span style="color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-mono);">Ключевые протоколы и стандарты:</span><br/>
          <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.9rem;">
            ${layer.protocols}
          </strong>
        </div>
      </div>

      <div class="analogy-box" style="margin: 0; padding: 12px 16px; border-left-color: ${layer.color};">
        <div class="analogy-icon" style="font-size: 1.4rem;">💡</div>
        <div class="analogy-body">
          <h4 style="color: ${layer.color}; font-size: 0.92rem; margin-bottom: 4px;">Жизненная аналогия:</h4>
          <p style="font-size: 0.88rem; margin: 0;">${layer.analogy}</p>
        </div>
      </div>
    `;
  }
}
