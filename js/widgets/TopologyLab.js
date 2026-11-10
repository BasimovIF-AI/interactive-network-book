/**
 * TopologyLab.js — Интерактивный краш-тест сетевых топологий (Шина, Звезда, Кольцо, Сетка).
 * Позволяет «резать» кабели кликом мыши и проверять живучесть сети.
 */

import { sounds } from '../audio/SoundManager.js';

export class TopologyLab {
  constructor(container) {
    this.container = container;
    this.currentTopology = 'star';
    this.nodes = [];
    this.wires = []; // [{ id, from, to, isCut }]
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🕸️</span>
            <span class="lab-title">Краш-тест топологий: Проверь сеть на прочность</span>
          </div>
          <span class="lab-badge">Лаборатория L1</span>
        </div>
        <div class="lab-body">
          <div class="topo-controls">
            <button class="topo-btn active" data-topo="star">⭐ Звезда (Star)</button>
            <button class="topo-btn" data-topo="bus">🚌 Общая шина (Bus)</button>
            <button class="topo-btn" data-topo="ring">💍 Кольцо (Ring)</button>
            <button class="topo-btn" data-topo="mesh">🕸️ Полносвязная (Mesh)</button>
            <button class="topo-btn" id="btn-repair-all" style="margin-left: auto; border-color: var(--accent-green); color: var(--accent-green);">
              🔧 Починить все кабели
            </button>
          </div>

          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
            ✂️ <strong>Инструкция:</strong> Кликай по проводам, чтобы перерезать их ножницами, затем нажми «Отправить пакет от PC-1 к PC-3» и проверь, дойдет ли сообщение!
          </p>

          <div class="topo-canvas-area" id="topo-stage">
            <svg id="topo-svg" style="position: absolute; width: 100%; height: 100%; pointer-events: auto;"></svg>
            <div id="topo-nodes-layer"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 10px;">
            <button class="topo-btn" id="btn-send-packet" style="background: var(--accent-cyan); color: #fff; font-weight: 700; padding: 10px 20px;">
              🚀 Отправить пакет: PC-1 ➔ PC-3
            </button>
            <div id="topo-status-msg" style="font-size: 0.95rem; font-weight: 600; font-family: var(--font-mono);">
              Готов к тесту
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.buildTopology('star');
  }

  bindEvents() {
    this.container.querySelectorAll('[data-topo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.click();
        this.container.querySelectorAll('[data-topo]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.buildTopology(e.target.dataset.topo);
      });
    });

    this.container.querySelector('#btn-repair-all').addEventListener('click', () => {
      sounds.click();
      this.wires.forEach(w => w.isCut = false);
      this.draw();
      this.setStatus('Все провода восстановлены!', 'var(--accent-green)');
    });

    this.container.querySelector('#btn-send-packet').addEventListener('click', () => {
      this.simulatePacketDelivery();
    });
  }

  buildTopology(type) {
    this.currentTopology = type;
    const stage = this.container.querySelector('#topo-stage');
    const w = stage.clientWidth || 700;
    const h = 280;
    const cx = w / 2;
    const cy = h / 2;

    this.nodes = [];
    this.wires = [];

    if (type === 'star') {
      // Центральный узел (Switch)
      this.nodes.push({ id: 'SW', label: 'HUB', x: cx, y: cy, isHub: true });
      // 4 хоста вокруг
      const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
      const radius = 100;
      ['PC-1', 'PC-2', 'PC-3', 'PC-4'].forEach((name, i) => {
        const x = cx + radius * Math.cos(angles[i]);
        const y = cy + radius * Math.sin(angles[i]);
        this.nodes.push({ id: `pc${i+1}`, label: name, x, y });
        this.wires.push({ id: `w_${name}`, from: 'SW', to: `pc${i+1}`, isCut: false });
      });
    } else if (type === 'bus') {
      // Общий хребет (магистраль)
      const yLine = cy;
      const xStart = cx - 220;
      const xEnd = cx + 220;
      this.nodes.push({ id: 't1', label: 'Т', x: xStart, y: yLine, isTerminator: true });
      this.nodes.push({ id: 'pc1', label: 'PC-1', x: cx - 140, y: yLine - 60 });
      this.nodes.push({ id: 'pc2', label: 'PC-2', x: cx - 50, y: yLine + 60 });
      this.nodes.push({ id: 'pc3', label: 'PC-3', x: cx + 50, y: yLine - 60 });
      this.nodes.push({ id: 'pc4', label: 'PC-4', x: cx + 140, y: yLine + 60 });
      this.nodes.push({ id: 't2', label: 'Т', x: xEnd, y: yLine, isTerminator: true });

      // Сегменты магистрали
      this.wires.push({ id: 'w_bus1', from: 't1', to: 'pc1', isCut: false });
      this.wires.push({ id: 'w_bus2', from: 'pc1', to: 'pc2', isCut: false });
      this.wires.push({ id: 'w_bus3', from: 'pc2', to: 'pc3', isCut: false });
      this.wires.push({ id: 'w_bus4', from: 'pc3', to: 'pc4', isCut: false });
      this.wires.push({ id: 'w_bus5', from: 'pc4', to: 't2', isCut: false });
    } else if (type === 'ring') {
      const radius = 95;
      const names = ['PC-1', 'PC-2', 'PC-3', 'PC-4'];
      names.forEach((name, i) => {
        const angle = (i * Math.PI) / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        this.nodes.push({ id: `pc${i+1}`, label: name, x, y });
      });
      // Соединение в кольцо 1-2-3-4-1
      this.wires.push({ id: 'w_ring1', from: 'pc1', to: 'pc2', isCut: false });
      this.wires.push({ id: 'w_ring2', from: 'pc2', to: 'pc3', isCut: false });
      this.wires.push({ id: 'w_ring3', from: 'pc3', to: 'pc4', isCut: false });
      this.wires.push({ id: 'w_ring4', from: 'pc4', to: 'pc1', isCut: false });
    } else if (type === 'mesh') {
      const radius = 100;
      const names = ['PC-1', 'PC-2', 'PC-3', 'PC-4'];
      names.forEach((name, i) => {
        const angle = (i * Math.PI) / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        this.nodes.push({ id: `pc${i+1}`, label: name, x, y });
      });
      // Полносвязное соединение (N * (N-1) / 2 = 6 линий)
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          this.wires.push({
            id: `w_${this.nodes[i].id}_${this.nodes[j].id}`,
            from: this.nodes[i].id,
            to: this.nodes[j].id,
            isCut: false
          });
        }
      }
    }

    this.draw();
    this.setStatus('Топология готова. Попробуй отрезать провод или отправить пакет!', 'var(--text-main)');
  }

  draw() {
    const svg = this.container.querySelector('#topo-svg');
    const nodesLayer = this.container.querySelector('#topo-nodes-layer');
    svg.innerHTML = '';
    nodesLayer.innerHTML = '';

    // Отрисовка проводов
    this.wires.forEach(w => {
      const nFrom = this.nodes.find(n => n.id === w.from);
      const nTo = this.nodes.find(n => n.id === w.to);
      if (!nFrom || !nTo) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', nFrom.x);
      line.setAttribute('y1', nFrom.y);
      line.setAttribute('x2', nTo.x);
      line.setAttribute('y2', nTo.y);
      line.setAttribute('class', `topo-wire ${w.isCut ? 'cut' : ''}`);

      line.addEventListener('click', () => {
        sounds.click();
        w.isCut = !w.isCut;
        this.draw();
        if (w.isCut) {
          sounds.error();
          this.setStatus(`✂️ Кабель между ${nFrom.label} и ${nTo.label} перерезан!`, 'var(--accent-red)');
        } else {
          this.setStatus(`🔧 Кабель восстановлен!`, 'var(--accent-green)');
        }
      });

      svg.appendChild(line);
    });

    // Отрисовка узлов
    this.nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `topo-node ${n.isHub ? 'hub' : ''}`;
      el.id = `node-${n.id}`;
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.textContent = n.label;
      if (n.isHub) {
        el.style.borderRadius = '8px';
        el.style.background = 'var(--accent-cyan)';
        el.style.color = '#fff';
      }
      nodesLayer.appendChild(el);
    });
  }

  simulatePacketDelivery() {
    sounds.packetSend();
    this.setStatus('Пакет отправлен из PC-1, идет поиск пути...', 'var(--accent-cyan)');

    // Проверка связности между PC-1 (pc1) и PC-3 (pc3) через поиск в ширину (BFS)
    const visited = new Set();
    const queue = ['pc1'];
    visited.add('pc1');

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === 'pc3') break;

      // Ищем все активные соединения
      this.wires.forEach(w => {
        if (w.isCut) return;
        let next = null;
        if (w.from === curr) next = w.to;
        if (w.to === curr) next = w.from;

        if (next && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      });
    }

    const reached = visited.has('pc3');

    // Анимация пакета (зеленый пульсирующий шарик)
    const svg = this.container.querySelector('#topo-svg');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', reached ? 'var(--accent-green)' : 'var(--accent-red)');

    const pc1 = this.nodes.find(n => n.id === 'pc1');
    circle.setAttribute('cx', pc1.x);
    circle.setAttribute('cy', pc1.y);
    svg.appendChild(circle);

    setTimeout(() => {
      circle.remove();
      if (reached) {
        sounds.packetArrive();
        sounds.success();
        this.setStatus('🎉 УСПЕХ! Пакет благополучно дошел до PC-3!', 'var(--accent-green)');
      } else {
        sounds.error();
        sounds.collision();
        this.setStatus('❌ СБОЙ! Пакет потерян: путь оборван перерезанным проводом!', 'var(--accent-red)');
      }
    }, 700);
  }

  setStatus(text, color) {
    const el = this.container.querySelector('#topo-status-msg');
    if (el) {
      el.textContent = text;
      el.style.color = color;
    }
  }
}
