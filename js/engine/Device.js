/**
 * Device.js — Узлы виртуальной сети: Host (ПК/Сервер), Switch (Коммутатор), Router (Маршрутизатор).
 * Моделирует реальное поведение сетевых устройств.
 */

import { BitMath } from './BitMath.js';
import { EthernetFrame, IPv4Packet, ArpMessage, IcmpMessage } from './Packet.js';

export class NetworkInterface {
  constructor({ name, mac, ip = null, cidr = null, vlanId = 1, isTrunk = false, allowedVlans = [] }) {
    this.name = name;
    this.mac = mac.toUpperCase();
    this.ip = ip;
    this.cidr = cidr;
    this.vlanId = vlanId;
    this.isTrunk = isTrunk;
    this.allowedVlans = allowedVlans.length > 0 ? allowedVlans : [vlanId];
    this.status = 'up';
    this.cable = null; // подключенный кабель/узел
  }
}

export class Device {
  constructor(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = type; // 'host' | 'switch' | 'router'
    this.interfaces = new Map();
    this.logHistory = [];
  }

  log(msg) {
    this.logHistory.push({ time: Date.now(), msg });
    if (this.logHistory.length > 50) this.logHistory.shift();
  }

  addInterface(iface) {
    this.interfaces.set(iface.name, iface);
  }

  getInterface(name) {
    return this.interfaces.get(name);
  }
}

export class HostDevice extends Device {
  constructor(id, name, mac, ip = null, cidr = 24, defaultGateway = null) {
    super(id, name, 'host');
    const eth0 = new NetworkInterface({ name: 'eth0', mac, ip, cidr });
    this.addInterface(eth0);
    this.defaultGateway = defaultGateway;
    this.arpTable = new Map(); // IP -> MAC
    this.onPacketReceived = null; // callback для UI
    this.onFrameSent = null;     // callback для анимации
  }

  get ip() {
    return this.getInterface('eth0').ip;
  }

  get mac() {
    return this.getInterface('eth0').mac;
  }

  get cidr() {
    return this.getInterface('eth0').cidr;
  }

  setIp(ip, cidr, defaultGateway = this.defaultGateway) {
    const iface = this.getInterface('eth0');
    iface.ip = ip;
    iface.cidr = cidr;
    this.defaultGateway = defaultGateway;
  }

  /**
   * Отправка ping на целевой IP
   */
  ping(targetIp) {
    const iface = this.getInterface('eth0');
    if (!iface.ip) throw new Error(`[${this.name}] Не настроен IP-адрес!`);

    // Определяем: цель в нашей подсети или нужно слать на шлюз?
    const isLocal = BitMath.isSameSubnet(iface.ip, targetIp, iface.cidr);
    const nextHopIp = isLocal ? targetIp : this.defaultGateway;

    if (!nextHopIp) {
      this.log(`Не удается определить шлюз для назначения ${targetIp}`);
      return { status: 'NO_GATEWAY', message: 'Destination Host Unreachable (No Gateway)' };
    }

    // Проверяем наличие MAC в ARP таблице
    let destMac = this.arpTable.get(nextHopIp);

    if (!destMac) {
      // Генерируем ARP-запрос (Broadcast)
      this.log(`ARP промах: отправляю ARP Who-has ${nextHopIp}?`);
      const arpReq = new ArpMessage({
        opcode: 1,
        senderMac: iface.mac,
        senderIp: iface.ip,
        targetMac: '00:00:00:00:00:00',
        targetIp: nextHopIp
      });

      const frame = new EthernetFrame({
        destMac: 'FF:FF:FF:FF:FF:FF',
        sourceMac: iface.mac,
        etherType: 0x0806,
        payload: arpReq
      });

      return { status: 'ARP_NEEDED', frame, targetIp, nextHopIp };
    }

    // MAC известен, отправляем ICMP Echo Request
    const icmp = new IcmpMessage({ type: 8, seq: 1 });
    const ipPacket = new IPv4Packet({
      sourceIp: iface.ip,
      destIp: targetIp,
      ttl: 64,
      protocol: 1, // ICMP
      payload: icmp
    });

    const frame = new EthernetFrame({
      destMac,
      sourceMac: iface.mac,
      etherType: 0x0800,
      payload: ipPacket
    });

    this.log(`Отправка ICMP Echo Request к ${targetIp} (MAC: ${destMac})`);
    return { status: 'SENT', frame };
  }

  /**
   * Прием входящего кадра
   */
  receiveFrame(frame, inPortName = 'eth0') {
    const iface = this.getInterface(inPortName);
    // Проверка фильтрации L2 (кадр нам или широковещательный?)
    if (frame.destMac !== iface.mac && !frame.isBroadcast()) {
      return { action: 'DROPPED', reason: 'L2 MAC mismatch' };
    }

    // Обработка ARP
    if (frame.etherType === 0x0806 && frame.payload instanceof ArpMessage) {
      const arp = frame.payload;
      // Обучаем свой ARP-кэш на отправителе
      this.arpTable.set(arp.senderIp, arp.senderMac);

      if (arp.isRequest() && arp.targetIp === iface.ip) {
        this.log(`ARP Запрос ко мне от ${arp.senderIp}. Шлю ARP Reply!`);
        const reply = new ArpMessage({
          opcode: 2,
          senderMac: iface.mac,
          senderIp: iface.ip,
          targetMac: arp.senderMac,
          targetIp: arp.senderIp
        });
        const outFrame = new EthernetFrame({
          destMac: arp.senderMac,
          sourceMac: iface.mac,
          etherType: 0x0806,
          payload: reply
        });
        return { action: 'REPLY', frame: outFrame };
      }

      if (arp.isReply() && arp.targetMac === iface.mac) {
        this.log(`Получен ARP ответ: ${arp.senderIp} -> ${arp.senderMac}`);
        return { action: 'ARP_LEARNED', ip: arp.senderIp, mac: arp.senderMac };
      }

      return { action: 'IGNORED', reason: 'ARP not for this host' };
    }

    // Обработка IPv4
    if (frame.etherType === 0x0800 && frame.payload instanceof IPv4Packet) {
      const ip = frame.payload;
      if (ip.destIp !== iface.ip && ip.destIp !== '255.255.255.255') {
        return { action: 'DROPPED', reason: 'L3 IP mismatch' };
      }

      // ICMP Ping
      if (ip.protocol === 1 && ip.payload instanceof IcmpMessage) {
        const icmp = ip.payload;
        if (icmp.type === 8) { // Echo Request
          this.log(`Получен Ping от ${ip.sourceIp}. Отвечаю Pong!`);
          const pong = new IcmpMessage({ type: 0, seq: icmp.seq });
          const pongIp = new IPv4Packet({
            sourceIp: iface.ip,
            destIp: ip.sourceIp,
            ttl: 64,
            protocol: 1,
            payload: pong
          });
          const outFrame = new EthernetFrame({
            destMac: frame.sourceMac,
            sourceMac: iface.mac,
            etherType: 0x0800,
            payload: pongIp
          });
          return { action: 'REPLY', frame: outFrame };
        } else if (icmp.type === 0) {
          this.log(`Успех! Получен Echo Reply от ${ip.sourceIp}!`);
          return { action: 'PING_SUCCESS', from: ip.sourceIp };
        }
      }

      return { action: 'RECEIVED', payload: ip.payload };
    }

    return { action: 'UNHANDLED' };
  }
}

export class SwitchDevice extends Device {
  constructor(id, name, portCount = 8) {
    super(id, name, 'switch');
    // CAM Table (MAC -> { port, vlanId, lastSeen })
    this.camTable = new Map();
    for (let i = 1; i <= portCount; i++) {
      const pName = `Fa0/${i}`;
      this.addInterface(new NetworkInterface({
        name: pName,
        mac: `02:SW:${BitMath.toHexString(i, 2)}:00:00:00`,
        vlanId: 1
      }));
    }
  }

  setPortVlan(portName, vlanId, isTrunk = false) {
    const iface = this.getInterface(portName);
    if (!iface) throw new Error(`Порт ${portName} не найден на ${this.name}`);
    iface.vlanId = vlanId;
    iface.isTrunk = isTrunk;
  }

  /**
   * Логика обработки входящего кадра на коммутаторе (Switch Logic)
   */
  processFrame(frame, inPortName) {
    const inIface = this.getInterface(inPortName);
    if (!inIface) return { action: 'ERROR', message: 'Unknown port' };

    // 1. Определение VLAN входящего кадра
    let vlanId = inIface.isTrunk && frame.vlanId ? frame.vlanId : inIface.vlanId;

    // 2. Обучение CAM таблицы (Learning)
    this.camTable.set(frame.sourceMac, {
      port: inPortName,
      vlanId,
      lastSeen: Date.now()
    });
    this.log(`CAM Learn: MAC ${frame.sourceMac} на порту ${inPortName} (VLAN ${vlanId})`);

    // 3. Принятие решения о пересылке (Forwarding / Filtering / Flooding)
    const outputs = [];

    // Если Broadcast или целевой MAC не найден в CAM таблице -> Unknown Unicast Flooding
    if (frame.isBroadcast() || !this.camTable.has(frame.destMac)) {
      this.log(`CAM Miss / Broadcast: Flooding кадра в VLAN ${vlanId}`);
      for (const [pName, iface] of this.interfaces.entries()) {
        if (pName === inPortName) continue; // Split Horizon (не шлем обратно в тот же порт)
        // Проверяем членство в VLAN
        if (iface.isTrunk || iface.vlanId === vlanId) {
          const outFrame = frame.clone();
          if (iface.isTrunk) {
            outFrame.vlanId = vlanId; // 802.1Q тег для транка
          } else {
            outFrame.vlanId = null;   // Снимаем тег для Access порта
          }
          outputs.push({ port: pName, frame: outFrame });
        }
      }
      return {
        action: 'FLOOD',
        reason: frame.isBroadcast() ? 'Broadcast' : 'Unknown Unicast',
        outputs
      };
    }

    // MAC известен: находим порт назначения
    const entry = this.camTable.get(frame.destMac);

    // Фильтрация (Filtering): если порт назначения совпадает с портом источника
    if (entry.port === inPortName) {
      this.log(`Filtering: порт назначения ${entry.port} совпадает с портом источника.`);
      return { action: 'FILTERED', reason: 'Same port' };
    }

    // Проверяем соответствие VLAN
    const outIface = this.getInterface(entry.port);
    if (!outIface.isTrunk && entry.vlanId !== vlanId) {
      this.log(`VLAN Mismatch: кадр из VLAN ${vlanId} не может попасть в VLAN ${entry.vlanId}`);
      return { action: 'DROPPED', reason: 'VLAN mismatch' };
    }

    const outFrame = frame.clone();
    if (outIface.isTrunk) {
      outFrame.vlanId = vlanId;
    } else {
      outFrame.vlanId = null;
    }

    outputs.push({ port: entry.port, frame: outFrame });
    this.log(`Forwarding: пересылка кадра строго в порт ${entry.port}`);
    return { action: 'FORWARD', outputs };
  }
}

export class RouterDevice extends Device {
  constructor(id, name) {
    super(id, name, 'router');
    this.routingTable = []; // [{ networkIp, cidr, nextHop, ifaceName, metric }]
    this.arpTable = new Map();
  }

  addRoute(networkIp, cidr, nextHop, ifaceName, metric = 1) {
    this.routingTable.push({ networkIp, cidr, nextHop, ifaceName, metric });
    // Сортировка по длине префикса (Longest Prefix Match - LPM)
    this.routingTable.sort((a, b) => b.cidr - a.cidr);
  }

  lookupRoute(destIp) {
    const destLong = BitMath.ipToLong(destIp);
    for (const route of this.routingTable) {
      const maskLong = BitMath.cidrToMaskLong(route.cidr);
      const netLong = BitMath.ipToLong(route.networkIp);
      if (((destLong & maskLong) >>> 0) === netLong) {
        return route;
      }
    }
    return null;
  }

  /**
   * Логика маршрутизации L3 пакета (Router Logic)
   */
  processFrame(frame, inPortName) {
    const inIface = this.getInterface(inPortName);
    // Проверка L2 MAC
    if (frame.destMac !== inIface.mac && !frame.isBroadcast()) {
      return { action: 'DROPPED', reason: 'L2 MAC mismatch for router' };
    }

    // ARP обработка
    if (frame.etherType === 0x0806 && frame.payload instanceof ArpMessage) {
      const arp = frame.payload;
      this.arpTable.set(arp.senderIp, arp.senderMac);
      if (arp.isRequest() && arp.targetIp === inIface.ip) {
        const reply = new ArpMessage({
          opcode: 2,
          senderMac: inIface.mac,
          senderIp: inIface.ip,
          targetMac: arp.senderMac,
          targetIp: arp.senderIp
        });
        const outFrame = new EthernetFrame({
          destMac: arp.senderMac,
          sourceMac: inIface.mac,
          etherType: 0x0806,
          payload: reply
        });
        return { action: 'REPLY', port: inPortName, frame: outFrame };
      }
      return { action: 'IGNORED' };
    }

    // IPv4 обработка
    if (frame.etherType === 0x0800 && frame.payload instanceof IPv4Packet) {
      const packet = frame.payload.clone();

      // Декремент TTL
      const alive = packet.decrementTtl();
      if (!alive) {
        this.log(`TTL истек (TTL=0) для пакета к ${packet.destIp}`);
        // Генерация ICMP Time Exceeded обратно отправителю
        const icmp = new IcmpMessage({ type: 11, code: 0 });
        const icmpIp = new IPv4Packet({
          sourceIp: inIface.ip,
          destIp: packet.sourceIp,
          ttl: 64,
          protocol: 1,
          payload: icmp
        });
        const outFrame = new EthernetFrame({
          destMac: frame.sourceMac,
          sourceMac: inIface.mac,
          etherType: 0x0800,
          payload: icmpIp
        });
        return { action: 'TTL_EXPIRED', port: inPortName, frame: outFrame };
      }

      // Поиск маршрута (LPM)
      const route = this.lookupRoute(packet.destIp);
      if (!route) {
        this.log(`Маршрут к ${packet.destIp} не найден! Packet Dropped.`);
        return { action: 'NO_ROUTE', reason: 'Network Unreachable' };
      }

      const outIface = this.getInterface(route.ifaceName);
      const nextHopIp = route.nextHop || packet.destIp;

      // Получаем MAC следующего хопа из ARP
      const nextHopMac = this.arpTable.get(nextHopIp) || '02:00:00:FF:FF:01'; // эмуляция

      // Переписывание L2 заголовка (MAC Rewrite): Source MAC = интерфейс роутера, Dest MAC = Next Hop
      const forwardedFrame = new EthernetFrame({
        destMac: nextHopMac,
        sourceMac: outIface.mac,
        etherType: 0x0800,
        payload: packet
      });

      this.log(`Маршрутизация: пересылка пакета к ${packet.destIp} через порт ${route.ifaceName}`);
      return { action: 'ROUTED', port: route.ifaceName, frame: forwardedFrame };
    }

    return { action: 'UNHANDLED' };
  }
}
