/**
 * TcpHandshakeSim.js — Интерактивный симулятор трехэтапного рукопожатия TCP (3-Way Handshake).
 * Демонстрирует флаги SYN, ACK, порядковые номера (SEQ), подтверждения (ACK) и переповторы при потере.
 */

import { sounds } from '../audio/SoundManager.js';

export class TcpHandshakeSim {
  constructor(container) {
    this.container = container;
    this.step = 0; // 0 = closed, 1 = SYN sent, 2 = SYN-ACK sent, 3 = ACK sent (ESTABLISHED)
    this.dropNextPacket = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🤝</span>
            <span class="lab-title">Симулятор 3-Way Handshake: Надежное рукопожатие TCP</span>
          </div>
          <span class="lab-badge">Лаборатория L4</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 16px;">
            В отличие от UDP, перед передачей веб-страницы или файла протокол TCP обязан «пожать руку» серверу. Пройди этот диалог по шагам!
          </p>

          <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="topo-btn" id="btn-tcp-next-step" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 18px;">
              ▶️ Следующий шаг диалога
            </button>
            <button class="topo-btn" id="btn-tcp-drop-toggle" style="padding: 10px 14px;">
              ⚡ Потерять следующий пакет (Drop): ВЫКЛ
            </button>
            <button class="topo-btn" id="btn-tcp-reset" style="padding: 10px 14px;">
              ↺ Начать заново
            </button>
          </div>

          <!-- Схема клиента и сервера -->
          <div style="display: grid; grid-template-columns: 140px 1fr 140px; gap: 10px; align-items: stretch; background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 20px; border: 1px solid var(--border-color);">
            <!-- Клиент -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 2.2rem;">💻</div>
              <strong style="margin-top: 6px;">Клиент (ПК)</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">Порт: 54120</span>
              <div id="tcp-client-state" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);">
                CLOSED
              </div>
            </div>

            <!-- Центральный канал сообщений -->
            <div id="tcp-messages-lane" style="display: flex; flex-direction: column; gap: 10px; justify-content: center;">
              <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                Нажми «Следующий шаг диалога» для отправки SYN
              </div>
            </div>

            <!-- Сервер -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 2.2rem;">🖥️</div>
              <strong style="margin-top: 6px;">Сервер (Web)</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">Порт: 80 (HTTP)</span>
              <div id="tcp-server-state" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);">
                LISTEN
              </div>
            </div>
          </div>

          <div id="tcp-explanation" style="margin-top: 16px; padding: 12px 16px; border-radius: var(--radius-sm); background: var(--bg-surface); border: 1px solid var(--border-color); font-size: 0.92rem;">
            Соединение закрыто. Клиент готовится запросить сессию.
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#btn-tcp-next-step').addEventListener('click', () => {
      this.advanceStep();
    });

    this.container.querySelector('#btn-tcp-drop-toggle').addEventListener('click', (e) => {
      sounds.click();
      this.dropNextPacket = !this.dropNextPacket;
      e.target.textContent = `⚡ Потерять следующий пакет (Drop): ${this.dropNextPacket ? 'ВКЛ 🛑' : 'ВЫКЛ'}`;
      e.target.style.borderColor = this.dropNextPacket ? 'var(--accent-red)' : 'var(--border-color)';
      e.target.style.color = this.dropNextPacket ? 'var(--accent-red)' : 'var(--text-main)';
    });

    this.container.querySelector('#btn-tcp-reset').addEventListener('click', () => {
      sounds.click();
      this.step = 0;
      this.resetView();
    });
  }

  advanceStep() {
    const lane = this.container.querySelector('#tcp-messages-lane');
    const clientState = this.container.querySelector('#tcp-client-state');
    const serverState = this.container.querySelector('#tcp-server-state');
    const exp = this.container.querySelector('#tcp-explanation');

    if (this.step === 0) {
      // Шаг 1: Клиент шлет SYN
      if (this.dropNextPacket) {
        sounds.collision();
        this.dropNextPacket = false;
        this.container.querySelector('#btn-tcp-drop-toggle').textContent = '⚡ Потерять следующий пакет (Drop): ВЫКЛ';
        lane.innerHTML = `
          <div style="background: rgba(248, 113, 113, 0.2); border: 1px solid var(--accent-red); padding: 8px; border-radius: 6px; text-align: center; color: var(--accent-red); font-family: var(--font-mono); font-size: 0.85rem;">
            💥 Пакет [SYN] потерян в пути! Сервер ничего не получил. Сработал таймер ожидания... Повтор!
          </div>
        `;
        exp.textContent = 'Таймаут истек: TCP автоматически переотправляет потерянный SYN-сегмент.';
        return;
      }

      sounds.packetSend();
      this.step = 1;
      clientState.textContent = 'SYN_SENT';
      serverState.textContent = 'SYN_RCVD';

      lane.innerHTML = `
        <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); padding: 8px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; display: flex; justify-content: space-between;">
          <span>➔ [SYN]</span>
          <span>Seq = 100</span>
          <span>Ack = 0</span>
        </div>
      `;
      exp.innerHTML = '<strong>Шаг 1:</strong> Клиент говорит: <em>«Привет! Хочу открыть соединение, мой начальный номер байта Seq=100»</em>.';

    } else if (this.step === 1) {
      // Шаг 2: Сервер шлет SYN-ACK
      sounds.packetSend();
      this.step = 2;

      lane.innerHTML += `
        <div style="background: rgba(74, 222, 128, 0.15); border: 1px solid var(--accent-green); padding: 8px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; display: flex; justify-content: space-between;">
          <span>⬅ [SYN, ACK]</span>
          <span>Seq = 500</span>
          <span>Ack = 101</span>
        </div>
      `;
      exp.innerHTML = '<strong>Шаг 2:</strong> Сервер отвечает: <em>«Привет, я тебя слышу! Твой Seq=100 подтверждаю (Ack=101), а мой начальный номер Seq=500»</em>.';

    } else if (this.step === 2) {
      // Шаг 3: Клиент шлет ACK (Соединение установлено!)
      sounds.packetArrive();
      sounds.success();
      this.step = 3;
      clientState.textContent = 'ESTABLISHED';
      serverState.textContent = 'ESTABLISHED';

      lane.innerHTML += `
        <div style="background: rgba(167, 139, 250, 0.15); border: 1px solid var(--accent-purple); padding: 8px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; display: flex; justify-content: space-between;">
          <span>➔ [ACK]</span>
          <span>Seq = 101</span>
          <span>Ack = 501</span>
        </div>
      `;
      exp.innerHTML = '🎉 <strong>Шаг 3:</strong> Клиент подтверждает: <em>«Принято, Ack=501! Рукопожатие завершено, сессия ESTABLISHED. Начинаем передачу данных!»</em>';
    } else {
      // Сброс
      this.step = 0;
      this.resetView();
    }
  }

  resetView() {
    this.container.querySelector('#tcp-client-state').textContent = 'CLOSED';
    this.container.querySelector('#tcp-server-state').textContent = 'LISTEN';
    this.container.querySelector('#tcp-messages-lane').innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
        Нажми «Следующий шаг диалога» для отправки SYN
      </div>
    `;
    this.container.querySelector('#tcp-explanation').textContent = 'Соединение закрыто. Клиент готовится запросить сессию.';
  }
}
