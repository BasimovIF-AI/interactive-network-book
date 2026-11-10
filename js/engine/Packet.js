/**
 * Packet.js — Модели данных сетевых пакетов, кадров и сегментов (PDU).
 * Позволяет визуализировать структуру заголовков на каждом уровне моделей OSI и TCP/IP.
 */

export class EthernetFrame {
  /**
   * @param {object} opts
   * @param {string} opts.destMac - MAC назначения ("AA:BB:CC:DD:EE:FF" или broadcast "FF:FF:FF:FF:FF:FF")
   * @param {string} opts.sourceMac - MAC отправителя
   * @param {number} [opts.etherType=0x0800] - 0x0800 (IPv4), 0x0806 (ARP), 0x86DD (IPv6), 0x8100 (VLAN)
   * @param {number|null} [opts.vlanId=null] - 802.1Q VLAN Tag (1-4094)
   * @param {any} opts.payload - Вложенный PDU (IPv4Packet, ArpMessage и т.д.)
   */
  constructor({ destMac, sourceMac, etherType = 0x0800, vlanId = null, payload = null }) {
    this.destMac = (destMac || 'FF:FF:FF:FF:FF:FF').toUpperCase();
    this.sourceMac = (sourceMac || '00:00:00:00:00:00').toUpperCase();
    this.etherType = etherType;
    this.vlanId = vlanId;
    this.payload = payload;
    this.fcs = this.calculateFcs();
  }

  isBroadcast() {
    return this.destMac === 'FF:FF:FF:FF:FF:FF';
  }

  calculateFcs() {
    // Упрощенная эмуляция 32-битного CRC для наглядности
    const str = `${this.destMac}${this.sourceMac}${this.etherType}${this.vlanId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
    }
    return '0x' + hash.toString(16).toUpperCase().padStart(8, '0');
  }

  clone() {
    return new EthernetFrame({
      destMac: this.destMac,
      sourceMac: this.sourceMac,
      etherType: this.etherType,
      vlanId: this.vlanId,
      payload: this.payload && typeof this.payload.clone === 'function' ? this.payload.clone() : this.payload
    });
  }
}

export class IPv4Packet {
  /**
   * @param {object} opts
   * @param {string} opts.sourceIp
   * @param {string} opts.destIp
   * @param {number} [opts.ttl=64]
   * @param {number} [opts.protocol=6] - 6 (TCP), 17 (UDP), 1 (ICMP)
   * @param {number} [opts.dscp=0]
   * @param {any} opts.payload
   */
  constructor({ sourceIp, destIp, ttl = 64, protocol = 6, dscp = 0, payload = null }) {
    this.version = 4;
    this.ihl = 5; // 20 байт заголовок
    this.dscp = dscp;
    this.ttl = ttl;
    this.protocol = protocol;
    this.sourceIp = sourceIp;
    this.destIp = destIp;
    this.payload = payload;
    this.id = Math.floor(Math.random() * 65535);
  }

  decrementTtl() {
    this.ttl--;
    return this.ttl > 0;
  }

  getProtocolName() {
    switch (this.protocol) {
      case 1: return 'ICMP';
      case 6: return 'TCP';
      case 17: return 'UDP';
      default: return `Proto(${this.protocol})`;
    }
  }

  clone() {
    const copy = new IPv4Packet({
      sourceIp: this.sourceIp,
      destIp: this.destIp,
      ttl: this.ttl,
      protocol: this.protocol,
      dscp: this.dscp,
      payload: this.payload && typeof this.payload.clone === 'function' ? this.payload.clone() : this.payload
    });
    copy.id = this.id;
    return copy;
  }
}

export class TcpSegment {
  /**
   * @param {object} opts
   * @param {number} opts.sourcePort
   * @param {number} opts.destPort
   * @param {number} [opts.seq=100]
   * @param {number} [opts.ack=0]
   * @param {object} [opts.flags={}] - { syn, ack, fin, rst, psh }
   * @param {number} [opts.windowSize=64240]
   * @param {string|object} [opts.payload='']
   */
  constructor({
    sourcePort,
    destPort,
    seq = 100,
    ack = 0,
    flags = {},
    windowSize = 64240,
    payload = ''
  }) {
    this.sourcePort = sourcePort;
    this.destPort = destPort;
    this.seq = seq;
    this.ack = ack;
    this.flags = {
      syn: !!flags.syn,
      ack: !!flags.ack,
      fin: !!flags.fin,
      rst: !!flags.rst,
      psh: !!flags.psh,
      urg: !!flags.urg
    };
    this.windowSize = windowSize;
    this.payload = payload;
  }

  getFlagsString() {
    const active = [];
    if (this.flags.syn) active.push('SYN');
    if (this.flags.ack) active.push('ACK');
    if (this.flags.fin) active.push('FIN');
    if (this.flags.rst) active.push('RST');
    if (this.flags.psh) active.push('PSH');
    return active.join(', ') || 'NONE';
  }

  clone() {
    return new TcpSegment({
      sourcePort: this.sourcePort,
      destPort: this.destPort,
      seq: this.seq,
      ack: this.ack,
      flags: { ...this.flags },
      windowSize: this.windowSize,
      payload: this.payload
    });
  }
}

export class UdpDatagram {
  /**
   * @param {object} opts
   * @param {number} opts.sourcePort
   * @param {number} opts.destPort
   * @param {string|object} [opts.payload='']
   */
  constructor({ sourcePort, destPort, payload = '' }) {
    this.sourcePort = sourcePort;
    this.destPort = destPort;
    this.payload = payload;
    this.length = 8 + (typeof payload === 'string' ? payload.length : 16);
  }

  clone() {
    return new UdpDatagram({
      sourcePort: this.sourcePort,
      destPort: this.destPort,
      payload: this.payload
    });
  }
}

export class ArpMessage {
  /**
   * @param {object} opts
   * @param {number} [opts.opcode=1] - 1 (Request), 2 (Reply)
   * @param {string} opts.senderMac
   * @param {string} opts.senderIp
   * @param {string} opts.targetMac - "00:00:00:00:00:00" в запросе
   * @param {string} opts.targetIp
   */
  constructor({ opcode = 1, senderMac, senderIp, targetMac = '00:00:00:00:00:00', targetIp }) {
    this.opcode = opcode; // 1 = Request, 2 = Reply
    this.senderMac = senderMac;
    this.senderIp = senderIp;
    this.targetMac = targetMac;
    this.targetIp = targetIp;
  }

  isRequest() {
    return this.opcode === 1;
  }

  isReply() {
    return this.opcode === 2;
  }

  clone() {
    return new ArpMessage({
      opcode: this.opcode,
      senderMac: this.senderMac,
      senderIp: this.senderIp,
      targetMac: this.targetMac,
      targetIp: this.targetIp
    });
  }
}

export class IcmpMessage {
  /**
   * @param {object} opts
   * @param {number} opts.type - 8 (Echo Req), 0 (Echo Reply), 11 (TTL Exceeded), 3 (Unreachable)
   * @param {number} [opts.code=0]
   * @param {number} [opts.seq=1]
   * @param {string} [opts.payload='']
   */
  constructor({ type = 8, code = 0, seq = 1, payload = 'PING_DATA' }) {
    this.type = type;
    this.code = code;
    this.seq = seq;
    this.payload = payload;
  }

  getTypeName() {
    switch (this.type) {
      case 8: return 'Echo Request (Ping)';
      case 0: return 'Echo Reply (Pong)';
      case 11: return 'Time Exceeded (TTL=0)';
      case 3: return 'Destination Unreachable';
      default: return `Type ${this.type}`;
    }
  }

  clone() {
    return new IcmpMessage({
      type: this.type,
      code: this.code,
      seq: this.seq,
      payload: this.payload
    });
  }
}
