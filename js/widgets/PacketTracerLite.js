/**
 * PacketTracerLite.js — Финальная интерактивная комната-квест «Спаси школьную сеть!».
 * Полноценная мини-песочница с диагностикой узлов, исправлением ошибок и салютом победы.
 */

import { sounds } from '../audio/SoundManager.js';

export class PacketTracerLite {
  constructor(container) {
    this.container = container;
    this.state = {
      studentIp: '192.168.1.25',
      studentMask: '255.255.255.240', // ОШИБКА 1: маска /28 отсекает шлюз 192.168.1.1!
      switchPortDown: true,             // ОШИБКА 2: порт к роутеру выключен (shutdown)
      routerAclBlocked: true            // ОШИБКА 3: в ACL роутера закрыт доступ к DNS/Web
    };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box" style="border: 2px solid var(--accent-purple);">
        <div class="lab-header" style="background: rgba(167, 139, 250, 0.1);">
          <div class="lab-title-area">
            <span class="lab-icon">🏆</span>
            <span class="lab-title">Большой финал: Квест «Спаси школьную сеть!»</span>
          </div>
          <span class="lab-badge" style="background: var(--accent-purple); color: #fff;">Финальный Экзамен</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 16px;">
            🚨 <strong>ЧП в школе:</strong> пропал интернет в компьютерном классе перед уроком информатики! В сети 3 скрытые проблемы. Найди и устрани их все, чтобы спасти урок!
          </p>

          <!-- Интерактивная карта сети -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
            <!-- Узел 1: ПК Ученика -->
            <div class="cam-table-wrapper" style="text-align: center;">
              <div style="font-size: 2rem;">💻</div>
              <strong>ПК Ученика</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin: 6px 0;">
                IP: <span id="pt-student-ip">${this.state.studentIp}</span><br/>
                Маска: <span id="pt-student-mask" style="color: ${this.state.studentMask === '255.255.255.0' ? 'var(--accent-green)' : 'var(--accent-red)'}">${this.state.studentMask}</span>
              </div>
              <button class="topo-btn" id="btn-fix-mask" style="width: 100%; font-size: 0.82rem; padding: 6px 8px;">
                ${this.state.studentMask === '255.255.255.0' ? '✅ Маска верна (/24)' : '🛠️ Исправить маску на /24'}
              </button>
            </div>

            <!-- Узел 2: Школьный коммутатор -->
            <div class="cam-table-wrapper" style="text-align: center;">
              <div style="font-size: 2rem;">🔀</div>
              <strong>Свитч Catalyst</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin: 6px 0;">
                Порт Fa0/1: Включен<br/>
                Порт Fa0/24 (К роутеру): <span id="pt-switch-port" style="color: ${this.state.switchPortDown ? 'var(--accent-red)' : 'var(--accent-green)'}">${this.state.switchPortDown ? 'SHUTDOWN 🛑' : 'UP (ВКЛ) 🟢'}</span>
              </div>
              <button class="topo-btn" id="btn-fix-port" style="width: 100%; font-size: 0.82rem; padding: 6px 8px;">
                ${this.state.switchPortDown ? '🔌 Поднять порт (no shutdown)' : '✅ Порт в работе (UP)'}
              </button>
            </div>

            <!-- Узел 3: Маршрутизатор -->
            <div class="cam-table-wrapper" style="text-align: center;">
              <div style="font-size: 2rem;">🛡️</div>
              <strong>Шлюз (Router)</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin: 6px 0;">
                Шлюз: 192.168.1.1<br/>
                Фильтр ACL: <span id="pt-router-acl" style="color: ${this.state.routerAclBlocked ? 'var(--accent-red)' : 'var(--accent-green)'}">${this.state.routerAclBlocked ? 'Блокирует выход 🛑' : 'Доступ открыт 🟢'}</span>
              </div>
              <button class="topo-btn" id="btn-fix-acl" style="width: 100%; font-size: 0.82rem; padding: 6px 8px;">
                ${this.state.routerAclBlocked ? '🔓 Открыть правило в ACL' : '✅ ACL настроен'}
              </button>
            </div>
          </div>

          <!-- Кнопка проверки связи -->
          <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <button class="topo-btn" id="btn-test-school-ping" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 12px 24px; font-size: 1rem;">
              🚀 Отправить пинг с ПК Ученика на сервер (8.8.8.8)
            </button>
            <div id="quest-status-box" style="font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem;">
              Сеть ожидает проверки...
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#btn-fix-mask').addEventListener('click', (e) => {
      sounds.click();
      this.state.studentMask = '255.255.255.0';
      e.target.textContent = '✅ Маска верна (/24)';
      e.target.style.borderColor = 'var(--accent-green)';
      e.target.style.color = 'var(--accent-green)';
      this.container.querySelector('#pt-student-mask').textContent = '255.255.255.0';
      this.container.querySelector('#pt-student-mask').style.color = 'var(--accent-green)';
      this.setStatus('🛠️ Маска исправлена на 255.255.255.0! Теперь ПК видит шлюз 192.168.1.1.', 'var(--accent-cyan)');
    });

    this.container.querySelector('#btn-fix-port').addEventListener('click', (e) => {
      sounds.click();
      this.state.switchPortDown = false;
      e.target.textContent = '✅ Порт в работе (UP)';
      e.target.style.borderColor = 'var(--accent-green)';
      e.target.style.color = 'var(--accent-green)';
      this.container.querySelector('#pt-switch-port').textContent = 'UP (ВКЛ) 🟢';
      this.container.querySelector('#pt-switch-port').style.color = 'var(--accent-green)';
      this.setStatus('🔌 Порт Fa0/24 активирован командой no shutdown!', 'var(--accent-cyan)');
    });

    this.container.querySelector('#btn-fix-acl').addEventListener('click', (e) => {
      sounds.click();
      this.state.routerAclBlocked = false;
      e.target.textContent = '✅ ACL настроен';
      e.target.style.borderColor = 'var(--accent-green)';
      e.target.style.color = 'var(--accent-green)';
      this.container.querySelector('#pt-router-acl').textContent = 'Доступ открыт 🟢';
      this.container.querySelector('#pt-router-acl').style.color = 'var(--accent-green)';
      this.setStatus('🔓 Добавлено разрешающее правило permit ip any any!', 'var(--accent-cyan)');
    });

    this.container.querySelector('#btn-test-school-ping').addEventListener('click', () => {
      this.runDiagnostics();
    });
  }

  runDiagnostics() {
    sounds.packetSend();
    this.setStatus('Идет отправка пакетов ICMP Echo Request...', 'var(--accent-cyan)');

    setTimeout(() => {
      if (this.state.studentMask !== '255.255.255.0') {
        sounds.error();
        this.setStatus('❌ СБОЙ L3: Неверная маска подсети! ПК считает шлюз чужой сетью.', 'var(--accent-red)');
        return;
      }

      if (this.state.switchPortDown) {
        sounds.error();
        sounds.collision();
        this.setStatus('❌ СБОЙ L2: Порт Fa0/24 на коммутаторе выключен! Кадр не доходит до роутера.', 'var(--accent-red)');
        return;
      }

      if (this.state.routerAclBlocked) {
        sounds.error();
        this.setStatus('❌ СБОЙ Безопасности: Роутер сбросил пакет из-за запрета в списке ACL!', 'var(--accent-red)');
        return;
      }

      // Все 3 исправлены! ПОБЕДА!
      sounds.packetArrive();
      sounds.success();
      this.setStatus('🎉 ПОБЕДА! Пакеты идут: Reply from 8.8.8.8: bytes=32 time=14ms TTL=58. Школьная сеть спасена!', 'var(--accent-green)');
    }, 700);
  }

  setStatus(msg, color) {
    const el = this.container.querySelector('#quest-status-box');
    if (el) {
      el.textContent = msg;
      el.style.color = color;
    }
  }
}
