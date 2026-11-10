/**
 * NetworkBus.js — Виртуальная среда передачи данных (кабели, события, коллизии, анимации).
 * Обеспечивает связь между виртуальными узлами и визуальным представлением в DOM.
 */

export class Cable {
  constructor(id, devA, portA, devB, portB, options = {}) {
    this.id = id;
    this.devA = devA;
    this.portA = portA;
    this.devB = devB;
    this.portB = portB;
    this.isCut = false; // для интерактивных краш-тестов
    this.bandwidthMbps = options.bandwidthMbps || 100;
    this.cost = options.cost || 10; // для OSPF
    this.isHalfDuplex = !!options.isHalfDuplex; // для моделирования коллизий (Hub)
    this.inFlight = []; // пакеты в полете
  }

  getOtherEnd(dev, port) {
    if (this.devA.id === dev.id && this.portA === port) {
      return { dev: this.devB, port: this.portB };
    }
    if (this.devB.id === dev.id && this.portB === port) {
      return { dev: this.devA, port: this.portA };
    }
    return null;
  }
}

export class NetworkBus {
  constructor() {
    this.devices = new Map();
    this.cables = new Map();
    this.listeners = new Set();
  }

  addDevice(dev) {
    this.devices.set(dev.id, dev);
  }

  connect(devA, portA, devB, portB, options = {}) {
    const id = `${devA.id}:${portA}-${devB.id}:${portB}`;
    const cable = new Cable(id, devA, portA, devB, portB, options);
    this.cables.set(id, cable);
    return cable;
  }

  findCable(dev, port) {
    for (const cable of this.cables.values()) {
      if (cable.isCut) continue;
      const other = cable.getOtherEnd(dev, port);
      if (other) return { cable, other };
    }
    return null;
  }

  cutCable(cableId) {
    const cable = this.cables.get(cableId);
    if (cable) {
      cable.isCut = true;
      this.emit('cable_cut', { cableId });
    }
  }

  repairCable(cableId) {
    const cable = this.cables.get(cableId);
    if (cable) {
      cable.isCut = false;
      this.emit('cable_repaired', { cableId });
    }
  }

  /**
   * Отправка кадра через кабель
   */
  transmit(fromDev, fromPort, frame, onComplete = null) {
    const conn = this.findCable(fromDev, fromPort);
    if (!conn) {
      this.emit('packet_dropped', {
        dev: fromDev,
        port: fromPort,
        frame,
        reason: 'Cable disconnected or broken'
      });
      return false;
    }

    const { cable, other } = conn;

    // Проверка коллизий для Half-Duplex (Хаб)
    if (cable.isHalfDuplex && cable.inFlight.length > 0) {
      this.emit('collision', {
        cableId: cable.id,
        frames: [frame, ...cable.inFlight]
      });
      cable.inFlight = [];
      return false;
    }

    cable.inFlight.push(frame);

    // Событие начала передачи кадра по проводу (для анимации)
    this.emit('transmit_start', {
      cableId: cable.id,
      fromDev,
      fromPort,
      toDev: other.dev,
      toPort: other.port,
      frame
    });

    // Эмуляция задержки распространения сигнала
    setTimeout(() => {
      const idx = cable.inFlight.indexOf(frame);
      if (idx !== -1) cable.inFlight.splice(idx, 1);

      this.emit('transmit_end', {
        cableId: cable.id,
        toDev: other.dev,
        toPort: other.port,
        frame
      });

      // Доставка кадра принимающему устройству
      let result = null;
      if (other.dev.type === 'switch') {
        result = other.dev.processFrame(frame, other.port);
        // Если коммутатор пересылает кадр дальше
        if (result.outputs) {
          for (const out of result.outputs) {
            this.transmit(other.dev, out.port, out.frame);
          }
        }
      } else if (other.dev.type === 'router') {
        result = other.dev.processFrame(frame, other.port);
        if (result.action === 'ROUTED' && result.frame) {
          this.transmit(other.dev, result.port, result.frame);
        } else if (result.action === 'REPLY' || result.action === 'TTL_EXPIRED') {
          this.transmit(other.dev, result.port, result.frame);
        }
      } else if (other.dev.type === 'host') {
        result = other.dev.receiveFrame(frame, other.port);
        if (result.action === 'REPLY' && result.frame) {
          this.transmit(other.dev, other.port, result.frame);
        }
      }

      if (typeof onComplete === 'function') {
        onComplete(result);
      }
    }, 400); // 400мс задержка для плавного восприятия анимации

    return true;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(eventType, data) {
    for (const listener of this.listeners) {
      try {
        listener(eventType, data);
      } catch (err) {
        console.error('NetworkBus listener error:', err);
      }
    }
  }
}
