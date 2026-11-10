/**
 * SubnetCutter.js — Интерактивный слайдер «Нож подсетей» (FLSM).
 * Наглядно разрезает сеть класса С на части и показывает сетевой, первый, последний и broadcast IP.
 */

import { sounds } from '../audio/SoundManager.js';
import { BitMath } from '../engine/BitMath.js';

export class SubnetCutter {
  constructor(container) {
    this.container = container;
    this.baseIp = '192.168.1.0';
    this.cidr = 26; // по умолчанию 4 подсети
    this.selectedSubnetIndex = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lab-box">
        <div class="lab-header">
          <div class="lab-title-area">
            <span class="lab-icon">🍕</span>
            <span class="lab-title">Интерактивный нож подсетей (FLSM Subnetting Visualizer)</span>
          </div>
          <span class="lab-badge">Лаборатория L3</span>
        </div>
        <div class="lab-body">
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 12px;">
            Двигай ползунок маски, чтобы разрезать исходную сеть <strong>${this.baseIp}/24</strong> на несколько независимых подсетей!
          </p>

          <div class="subnet-slider-ctrl">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 1.1rem; color: var(--accent-cyan);">
                Префикс: /<span id="subnet-cidr-val">${this.cidr}</span>
              </span>
              <span style="font-family: var(--font-mono); font-size: 0.9rem;" id="subnet-mask-str">
                Маска: 255.255.255.192
              </span>
            </div>
            <input type="range" id="subnet-slider" min="24" max="30" value="${this.cidr}" step="1" />
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono);">
              <span>/24 (1 сеть)</span>
              <span>/25 (2 сети)</span>
              <span>/26 (4 сети)</span>
              <span>/27 (8 сетей)</span>
              <span>/28 (16)</span>
              <span>/29 (32)</span>
              <span>/30 (64)</span>
            </div>
          </div>

          <!-- Визуальная полоса нарезки -->
          <div style="margin-top: 20px;">
            <div style="font-size: 0.82rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">
              Карта распределения адресного пространства:
            </div>
            <div class="subnet-blocks-container" id="subnet-blocks-row"></div>
          </div>

          <!-- Детали выбранного блока -->
          <div id="subnet-details-card" style="margin-top: 20px; background: var(--bg-surface-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
            <div style="font-weight: 700; font-size: 1rem; color: var(--accent-green); margin-bottom: 12px;" id="sub-card-title">
              Параметры выбранной подсети #1
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-family: var(--font-mono); font-size: 0.88rem;">
              <div>
                <span style="color: var(--text-muted);">Адрес сети:</span><br/>
                <strong id="sub-net-ip" style="color: var(--accent-cyan);">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Первый хост:</span><br/>
                <strong id="sub-first-host">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Последний хост:</span><br/>
                <strong id="sub-last-host">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Broadcast IP:</span><br/>
                <strong id="sub-bcast-ip" style="color: var(--accent-amber);">-</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Полезных хостов:</span><br/>
                <strong id="sub-usable-hosts" style="color: var(--accent-green);">-</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.update();
  }

  bindEvents() {
    const slider = this.container.querySelector('#subnet-slider');
    slider.addEventListener('input', (e) => {
      sounds.click();
      this.cidr = parseInt(e.target.value, 10);
      this.selectedSubnetIndex = 0;
      this.update();
    });
  }

  update() {
    this.container.querySelector('#subnet-cidr-val').textContent = this.cidr;
    this.container.querySelector('#subnet-mask-str').textContent = `Маска: ${BitMath.cidrToMaskIp(this.cidr)}`;

    const numSubnets = Math.pow(2, this.cidr - 24);
    const blockSize = Math.pow(2, 32 - this.cidr);
    const baseLong = BitMath.ipToLong(this.baseIp);

    const blocksRow = this.container.querySelector('#subnet-blocks-row');
    blocksRow.innerHTML = '';

    for (let i = 0; i < numSubnets; i++) {
      const netLong = baseLong + (i * blockSize);
      const netIp = BitMath.longToIp(netLong);

      const block = document.createElement('div');
      block.className = 'subnet-block';
      if (i === this.selectedSubnetIndex) {
        block.style.outline = '2px solid #fff';
        block.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.8)';
      }
      block.textContent = numSubnets <= 8 ? `#${i+1} (${netIp})` : `#${i+1}`;

      block.addEventListener('click', () => {
        sounds.click();
        this.selectedSubnetIndex = i;
        this.update();
      });

      blocksRow.appendChild(block);
    }

    // Вычисляем данные выбранной подсети
    const chosenNetLong = baseLong + (this.selectedSubnetIndex * blockSize);
    const chosenNetIp = BitMath.longToIp(chosenNetLong);
    const subInfo = BitMath.calculateSubnet(chosenNetIp, this.cidr);

    this.container.querySelector('#sub-card-title').textContent = `Подсеть #${this.selectedSubnetIndex + 1} (${subInfo.networkIp}/${this.cidr})`;
    this.container.querySelector('#sub-net-ip').textContent = subInfo.networkIp;
    this.container.querySelector('#sub-first-host').textContent = subInfo.firstHostIp;
    this.container.querySelector('#sub-last-host').textContent = subInfo.lastHostIp;
    this.container.querySelector('#sub-bcast-ip').textContent = subInfo.broadcastIp;
    this.container.querySelector('#sub-usable-hosts').textContent = `${subInfo.usableHosts} устройств`;
  }
}
