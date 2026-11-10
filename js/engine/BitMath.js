/**
 * BitMath.js — Математический модуль побитовых операций, адресации и подсетей IPv4/IPv6.
 * Не содержит зависимостей, оперирует беззнаковыми 32-битными целыми через unsigned right shift (>>> 0).
 */

export class BitMath {
  /**
   * Преобразует число в двоичную строку фиксированной длины с разделителями по байтам или нибблам.
   * @param {number} num
   * @param {number} bits - количество бит (по умолчанию 8)
   * @returns {string} например "11000000"
   */
  static toBinaryString(num, bits = 8) {
    const safeNum = (num >>> 0) & ((1 << bits) - 1 || 0xffffffff);
    return safeNum.toString(2).padStart(bits, '0');
  }

  /**
   * Преобразует двоичную строку в число.
   * @param {string} str
   * @returns {number}
   */
  static parseBinary(str) {
    const clean = str.replace(/[^01]/g, '');
    return parseInt(clean, 2) || 0;
  }

  /**
   * Преобразует число в шестнадцатеричную строку (HEX).
   * @param {number} num
   * @param {number} digits
   * @returns {string}
   */
  static toHexString(num, digits = 2) {
    return (num >>> 0).toString(16).toUpperCase().padStart(digits, '0');
  }

  /**
   * Преобразует IPv4 строку "192.168.1.1" в беззнаковое 32-битное число.
   * @param {string} ip
   * @returns {number}
   */
  static ipToLong(ip) {
    if (!ip || typeof ip !== 'string') return 0;
    const octets = ip.trim().split('.').map(x => parseInt(x, 10));
    if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
      throw new Error(`Некорректный формат IPv4 адреса: "${ip}"`);
    }
    return (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0);
  }

  /**
   * Преобразует беззнаковое 32-битное число в IPv4 строку "192.168.1.1".
   * @param {number} long
   * @returns {string}
   */
  static longToIp(long) {
    const u = long >>> 0;
    const o1 = (u >>> 24) & 0xff;
    const o2 = (u >>> 16) & 0xff;
    const o3 = (u >>> 8) & 0xff;
    const o4 = u & 0xff;
    return `${o1}.${o2}.${o3}.${o4}`;
  }

  /**
   * Преобразует префикс CIDR (например, 24) в 32-битное беззнаковое число маски.
   * @param {number} cidr
   * @returns {number}
   */
  static cidrToMaskLong(cidr) {
    if (cidr < 0 || cidr > 32) {
      throw new Error(`Префикс CIDR должен быть от 0 до 32, получено: ${cidr}`);
    }
    if (cidr === 0) return 0;
    return ((0xffffffff << (32 - cidr)) >>> 0);
  }

  /**
   * Преобразует префикс CIDR (например 24) в строку маски "255.255.255.0".
   * @param {number} cidr
   * @returns {string}
   */
  static cidrToMaskIp(cidr) {
    return this.longToIp(this.cidrToMaskLong(cidr));
  }

  /**
   * Преобразует строку маски "255.255.255.0" в префикс CIDR (24).
   * @param {string} maskIp
   * @returns {number}
   */
  static maskIpToCidr(maskIp) {
    const long = this.ipToLong(maskIp);
    let count = 0;
    for (let i = 31; i >= 0; i--) {
      if ((long >>> i) & 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Детальный расчет параметров подсети IPv4.
   * @param {string} ip
   * @param {number} cidr
   * @returns {object}
   */
  static calculateSubnet(ip, cidr) {
    const ipLong = this.ipToLong(ip);
    const maskLong = this.cidrToMaskLong(cidr);
    const wildcardLong = (~maskLong) >>> 0;

    const networkLong = (ipLong & maskLong) >>> 0;
    const broadcastLong = (networkLong | wildcardLong) >>> 0;

    const totalHosts = cidr === 0 ? 4294967296 : Math.pow(2, 32 - cidr);
    let usableHosts = 0;
    let firstHostLong = networkLong;
    let lastHostLong = broadcastLong;

    if (cidr === 32) {
      usableHosts = 1;
      firstHostLong = networkLong;
      lastHostLong = networkLong;
    } else if (cidr === 31) {
      usableHosts = 2; // RFC 3021 соединение точка-точка
      firstHostLong = networkLong;
      lastHostLong = broadcastLong;
    } else {
      usableHosts = Math.max(0, totalHosts - 2);
      firstHostLong = (networkLong + 1) >>> 0;
      lastHostLong = (broadcastLong - 1) >>> 0;
    }

    return {
      ip,
      cidr,
      maskIp: this.longToIp(maskLong),
      wildcardIp: this.longToIp(wildcardLong),
      networkIp: this.longToIp(networkLong),
      broadcastIp: this.longToIp(broadcastLong),
      firstHostIp: this.longToIp(firstHostLong),
      lastHostIp: this.longToIp(lastHostLong),
      totalHosts,
      usableHosts,
      ipBinary: this.toBinaryString(ipLong, 32),
      maskBinary: this.toBinaryString(maskLong, 32),
      networkBinary: this.toBinaryString(networkLong, 32)
    };
  }

  /**
   * Проверяет, находятся ли два IP в одной подсети с заданной маской.
   * @param {string} ip1
   * @param {string} ip2
   * @param {number} cidr
   * @returns {boolean}
   */
  static isSameSubnet(ip1, ip2, cidr) {
    const mask = this.cidrToMaskLong(cidr);
    const n1 = (this.ipToLong(ip1) & mask) >>> 0;
    const n2 = (this.ipToLong(ip2) & mask) >>> 0;
    return n1 === n2;
  }

  /**
   * Сжатие IPv6 адреса по стандарту RFC 5952.
   * @param {string} ipv6
   * @returns {string}
   */
  static compressIpv6(ipv6) {
    if (!ipv6) return '';
    // Развернуть и нормализовать до 8 шестнадцатеричных секций
    const parts = this.expandIpv6(ipv6).split(':');
    const hex = parts.map(p => parseInt(p, 16).toString(16));

    // Найти самую длинную последовательность из нулей (минимум 2 нуля подряд)
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;

    for (let i = 0; i < 8; i++) {
      if (hex[i] === '0') {
        if (curStart === -1) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestLen = curLen;
          bestStart = curStart;
        }
      } else {
        curStart = -1;
        curLen = 0;
      }
    }

    if (bestLen >= 2) {
      const before = hex.slice(0, bestStart).join(':');
      const after = hex.slice(bestStart + bestLen).join(':');
      return `${before}::${after}`.replace(/^:{3,}/, '::').replace(/:{3,}$/, '::');
    }

    return hex.join(':');
  }

  /**
   * Разворачивает сжатый IPv6 адрес в полный вид из 8 хекстетов по 4 символа.
   * @param {string} ipv6
   * @returns {string}
   */
  static expandIpv6(ipv6) {
    let clean = ipv6.trim().toLowerCase();
    if (clean === '::') {
      return '0000:0000:0000:0000:0000:0000:0000:0000';
    }

    if (clean.includes('::')) {
      const sides = clean.split('::');
      const left = sides[0] ? sides[0].split(':') : [];
      const right = sides[1] ? sides[1].split(':') : [];
      const missing = 8 - (left.length + right.length);
      const zeros = Array(missing).fill('0');
      const full = [...left, ...zeros, ...right];
      return full.map(h => h.padStart(4, '0')).join(':');
    }

    return clean.split(':').map(h => h.padStart(4, '0')).join(':');
  }
}
