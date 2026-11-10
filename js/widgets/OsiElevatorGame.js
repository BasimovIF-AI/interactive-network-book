/**
 * OsiElevatorGame.js — Интерактивная аркадная игра «Сортировочный лифт уровней OSI».
 * Позволяет подростку на практике закрепить принадлежность протоколов, адресов
 * и устройств к 7 этажам модели OSI в игровом формате с набором очков.
 */

import { sounds } from '../audio/SoundManager.js';

const GAME_CARDS = [
  { item: '🔌 Кабель витая пара Cat5e', correctLayer: 1, hint: 'Провод — это материальный мир физического уровня L1.' },
  { item: '🏷️ MAC-адрес 00:1A:2B:3C:4D:5E', correctLayer: 2, hint: 'MAC-адреса принадлежат канальному уровню L2.' },
  { item: '🌐 IP-адрес 192.168.1.1', correctLayer: 3, hint: 'Глобальная адресация пакетов происходит на сетевом уровне L3.' },
  { item: '🚪 Порт 443 (HTTPS веб-трафик)', correctLayer: 4, hint: 'Номера портов программ определяются на транспортном уровне L4.' },
  { item: '🔒 Шифрование паролей TLS 1.3', correctLayer: 6, hint: 'Шифрование и преобразование форматов — задача уровня представлений L6.' },
  { item: '💬 Сообщение в чате Roblox', correctLayer: 7, hint: 'Прикладные данные пользователя рождаются на прикладном уровне L7.' },
  { item: '🔀 Коммутатор (Switch)', correctLayer: 2, hint: 'Коммутатор пересылает кадры по MAC-адресам на канальном уровне L2.' },
  { item: '🧭 Маршрутизатор (Router)', correctLayer: 3, hint: 'Маршрутизатор соединяет разные сети по IP-адресам на уровне L3.' },
  { item: '⏱️ Чекпоинт сессии загрузки файла', correctLayer: 5, hint: 'Поддержание диалога и контрольные точки — сеансовый уровень L5.' },
  { item: '⚡ Электрический импульс +5 Вольт', correctLayer: 1, hint: 'Напряжение и физические биты живут на уровне L1.' },
  { item: '📦 TCP-сегмент с флагом SYN', correctLayer: 4, hint: 'Сегменты TCP и рукопожатия — транспортный уровень L4.' },
  { item: '🖼️ Сжатие картинки в формат JPEG', correctLayer: 6, hint: 'Форматы изображений и сжатие — уровень представлений L6.' }
];

export class OsiElevatorGame {
  constructor(container) {
    this.container = container;
    this.score = 0;
    this.streak = 0;
    this.currentIndex = 0;
    this.cards = [...GAME_CARDS].sort(() => Math.random() - 0.5);
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🛗</span>
            <span class="lab-title">Сортировочный лифт OSI: Распредели протоколы по 7 этажам</span>
          </div>
          <span class="lab-badge">Мини-игра L1-L7</span>
        </div>
        <div class="lab-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <p style="font-size: 0.92rem; color: var(--text-muted); margin: 0;">
              Внимательно посмотри на выпавший сетевой объект и нажми на кнопку этажа, куда его должен доставить лифт!
            </p>
            <div style="display: flex; gap: 14px; font-family: var(--font-mono); font-size: 0.9rem; font-weight: 700;">
              <span style="color: var(--accent-cyan);">Очки: <span id="game-score">0</span></span>
              <span style="color: var(--accent-green);">Серия: <span id="game-streak">0</span> 🔥</span>
            </div>
          </div>

          <!-- Центральная игровая зона -->
          <div style="display: grid; grid-template-columns: 1fr 240px; gap: 20px; align-items: stretch;">
            <!-- Левая колонка: Текущая карточка и результат -->
            <div style="background: var(--bg-surface-card); border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span style="font-size: 0.75rem; text-transform: uppercase; font-family: var(--font-mono); color: var(--text-muted); font-weight: 700;">
                  Входящая посылка на конвейере:
                </span>
                <div id="target-item-card" style="
                  margin-top: 14px;
                  background: var(--bg-surface);
                  border: 2px dashed var(--accent-cyan);
                  border-radius: var(--radius-md);
                  padding: 20px;
                  text-align: center;
                  font-size: 1.25rem;
                  font-weight: 800;
                  color: var(--accent-cyan);
                  transition: transform 0.2s, background 0.2s;">
                  ...
                </div>
              </div>

              <div id="game-feedback-text" style="
                margin-top: 16px;
                padding: 12px 14px;
                border-radius: var(--radius-sm);
                font-size: 0.9rem;
                display: none;">
              </div>
            </div>

            <!-- Правая колонка: 7 кнопок этажей лифта -->
            <div style="display: flex; flex-direction: column; gap: 6px;" id="elevator-buttons-col"></div>
          </div>
        </div>
      </div>
    `;

    this.renderElevatorButtons();
    this.showNextCard();
  }

  renderElevatorButtons() {
    const col = this.container.querySelector('#elevator-buttons-col');
    col.innerHTML = '';

    const floors = [
      { num: 7, name: '7. Прикладной' },
      { num: 6, name: '6. Представления' },
      { num: 5, name: '5. Сеансовый' },
      { num: 4, name: '4. Транспортный' },
      { num: 3, name: '3. Сетевой' },
      { num: 2, name: '2. Канальный' },
      { num: 1, name: '1. Физический' }
    ];

    floors.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'topo-btn';
      btn.dataset.floor = f.num;
      btn.style.cssText = `
        text-align: left;
        padding: 8px 12px;
        font-size: 0.82rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      btn.innerHTML = `
        <span><strong>Этаж ${f.num}:</strong> ${f.name.split('. ')[1]}</span>
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">L${f.num}</span>
      `;

      btn.addEventListener('click', () => {
        this.handleFloorPick(f.num);
      });

      col.appendChild(btn);
    });
  }

  showNextCard() {
    if (this.currentIndex >= this.cards.length) {
      this.finishGame();
      return;
    }

    const currentCard = this.cards[this.currentIndex];
    const cardEl = this.container.querySelector('#target-item-card');
    cardEl.textContent = currentCard.item;
    cardEl.style.transform = 'scale(1)';
    cardEl.style.borderStyle = 'dashed';
    cardEl.style.borderColor = 'var(--accent-cyan)';
    cardEl.style.background = 'var(--bg-surface)';

    const fb = this.container.querySelector('#game-feedback-text');
    fb.style.display = 'none';
  }

  handleFloorPick(chosenFloor) {
    const card = this.cards[this.currentIndex];
    const cardEl = this.container.querySelector('#target-item-card');
    const fb = this.container.querySelector('#game-feedback-text');

    if (chosenFloor === card.correctLayer) {
      sounds.success();
      this.score += 10 + (this.streak * 2);
      this.streak++;
      cardEl.style.borderStyle = 'solid';
      cardEl.style.borderColor = 'var(--accent-green)';
      cardEl.style.background = 'rgba(74, 222, 128, 0.15)';
      cardEl.style.transform = 'scale(1.03)';

      fb.style.display = 'block';
      fb.style.background = 'rgba(74, 222, 128, 0.15)';
      fb.style.color = 'var(--accent-green)';
      fb.innerHTML = `🎉 <strong>Точно на этаж ${card.correctLayer}!</strong> ${card.hint}`;

      this.updateScoreView();

      setTimeout(() => {
        this.currentIndex++;
        this.showNextCard();
      }, 1000);

    } else {
      sounds.error();
      this.streak = 0;
      cardEl.style.borderStyle = 'solid';
      cardEl.style.borderColor = 'var(--accent-red)';
      cardEl.style.background = 'rgba(248, 113, 113, 0.15)';

      fb.style.display = 'block';
      fb.style.background = 'rgba(248, 113, 113, 0.15)';
      fb.style.color = 'var(--accent-red)';
      fb.innerHTML = `❌ <strong>Не тот этаж!</strong> Подсказка: ${card.hint} Попробуй еще раз!`;

      this.updateScoreView();
    }
  }

  updateScoreView() {
    this.container.querySelector('#game-score').textContent = this.score;
    this.container.querySelector('#game-streak').textContent = this.streak;
  }

  finishGame() {
    sounds.packetArrive();
    const cardEl = this.container.querySelector('#target-item-card');
    cardEl.innerHTML = `🏆 Все посылки доставлены!<br/><span style="font-size: 1rem; color: var(--accent-green);">Итоговый счет: ${this.score} очков</span>`;

    const fb = this.container.querySelector('#game-feedback-text');
    fb.style.display = 'block';
    fb.style.background = 'rgba(56, 189, 248, 0.15)';
    fb.style.color = 'var(--accent-cyan)';
    fb.innerHTML = `🎓 <strong>Блестящая работа!</strong> Ты безупречно ориентируешься во всех 7 уровнях модели OSI!`;
  }
}
