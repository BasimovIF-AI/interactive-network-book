import test from 'node:test';
import assert from 'node:assert/strict';

import { BitMath } from '../js/engine/BitMath.js';
import { EthernetFrame, IPv4Packet, TcpSegment, ArpMessage, IcmpMessage } from '../js/engine/Packet.js';
import { HostDevice, SwitchDevice, RouterDevice } from '../js/engine/Device.js';

test('BitMath: Двоичные и шестнадцатеричные преобразования', () => {
  assert.equal(BitMath.toBinaryString(192, 8), '11000000');
  assert.equal(BitMath.toBinaryString(255, 8), '11111111');
  assert.equal(BitMath.toBinaryString(5, 4), '0101');
  assert.equal(BitMath.parseBinary('11000000'), 192);
  assert.equal(BitMath.toHexString(255, 2), 'FF');
  assert.equal(BitMath.toHexString(10, 2), '0A');
});

test('BitMath: IPv4 конвертация и маски подсетей', () => {
  const ipLong = BitMath.ipToLong('192.168.1.1');
  assert.equal(ipLong, 3232235777);
  assert.equal(BitMath.longToIp(ipLong), '192.168.1.1');

  assert.equal(BitMath.cidrToMaskIp(24), '255.255.255.0');
  assert.equal(BitMath.cidrToMaskIp(16), '255.255.0.0');
  assert.equal(BitMath.cidrToMaskIp(30), '255.255.255.252');

  assert.equal(BitMath.maskIpToCidr('255.255.255.0'), 24);
  assert.equal(BitMath.maskIpToCidr('255.255.255.252'), 30);
});

test('BitMath: Детальный расчет подсетей (FLSM)', () => {
  const sub24 = BitMath.calculateSubnet('192.168.1.55', 24);
  assert.equal(sub24.networkIp, '192.168.1.0');
  assert.equal(sub24.broadcastIp, '192.168.1.255');
  assert.equal(sub24.firstHostIp, '192.168.1.1');
  assert.equal(sub24.lastHostIp, '192.168.1.254');
  assert.equal(sub24.usableHosts, 254);
  assert.equal(sub24.totalHosts, 256);

  const sub30 = BitMath.calculateSubnet('10.0.0.9', 30);
  assert.equal(sub30.networkIp, '10.0.0.8');
  assert.equal(sub30.broadcastIp, '10.0.0.11');
  assert.equal(sub30.firstHostIp, '10.0.0.9');
  assert.equal(sub30.lastHostIp, '10.0.0.10');
  assert.equal(sub30.usableHosts, 2);

  assert.equal(BitMath.isSameSubnet('192.168.1.10', '192.168.1.20', 24), true);
  assert.equal(BitMath.isSameSubnet('192.168.1.10', '192.168.2.10', 24), false);
});

test('BitMath: IPv6 сжатие и разворачивание', () => {
  const full = '2001:0db8:0000:0000:0000:0000:0000:0001';
  const compressed = BitMath.compressIpv6(full);
  assert.equal(compressed, '2001:db8::1');

  const expanded = BitMath.expandIpv6('2001:db8::1');
  assert.equal(expanded, '2001:0db8:0000:0000:0000:0000:0000:0001');
});

test('Packet: Модели PDU и инкапсуляция', () => {
  const tcp = new TcpSegment({ sourcePort: 54321, destPort: 80, flags: { syn: true } });
  assert.equal(tcp.getFlagsString(), 'SYN');

  const ip = new IPv4Packet({
    sourceIp: '192.168.1.10',
    destIp: '192.168.1.20',
    ttl: 64,
    protocol: 6,
    payload: tcp
  });
  assert.equal(ip.getProtocolName(), 'TCP');
  assert.equal(ip.decrementTtl(), true);
  assert.equal(ip.ttl, 63);

  const frame = new EthernetFrame({
    destMac: 'FF:FF:FF:FF:FF:FF',
    sourceMac: '00:11:22:33:44:55',
    etherType: 0x0800,
    payload: ip
  });
  assert.equal(frame.isBroadcast(), true);
  assert.ok(frame.fcs.startsWith('0x'));
});

test('Device: Host отправка ping и обработка ARP', () => {
  const pc1 = new HostDevice('pc1', 'PC-1', '00:00:00:00:00:01', '192.168.1.10', 24, '192.168.1.1');
  const pc2 = new HostDevice('pc2', 'PC-2', '00:00:00:00:00:02', '192.168.1.20', 24, '192.168.1.1');

  // PC1 пингует PC2: так как ARP пуст, возвращается статус ARP_NEEDED
  const res = pc1.ping('192.168.1.20');
  assert.equal(res.status, 'ARP_NEEDED');
  assert.equal(res.frame.isBroadcast(), true);
  assert.equal(res.frame.etherType, 0x0806);

  // PC2 принимает этот ARP-запрос
  const replyRes = pc2.receiveFrame(res.frame, 'eth0');
  assert.equal(replyRes.action, 'REPLY');
  assert.equal(replyRes.frame.destMac, '00:00:00:00:00:01');

  // PC1 получает ARP Reply и обучается
  const learned = pc1.receiveFrame(replyRes.frame, 'eth0');
  assert.equal(learned.action, 'ARP_LEARNED');
  assert.equal(pc1.arpTable.get('192.168.1.20'), '00:00:00:00:00:02');

  // Теперь повторный ping идет сразу через ICMP!
  const pingRes = pc1.ping('192.168.1.20');
  assert.equal(pingRes.status, 'SENT');
  assert.equal(pingRes.frame.destMac, '00:00:00:00:00:02');
  assert.equal(pingRes.frame.payload.protocol, 1);
});

test('Device: Switch обучение CAM-таблицы, Flooding и Forwarding', () => {
  const sw = new SwitchDevice('sw1', 'Switch-1', 4);
  const frameA = new EthernetFrame({
    destMac: '00:00:00:00:00:02',
    sourceMac: '00:00:00:00:00:01',
    etherType: 0x0800
  });

  // 1. Первый кадр от PC1 (порт Fa0/1): свич не знает, где PC2 -> FLOOD
  const res1 = sw.processFrame(frameA, 'Fa0/1');
  assert.equal(res1.action, 'FLOOD');
  assert.equal(sw.camTable.has('00:00:00:00:00:01'), true);
  assert.equal(sw.camTable.get('00:00:00:00:00:01').port, 'Fa0/1');

  // 2. Ответный кадр от PC2 (порт Fa0/2) к PC1: свич уже знает PC1! -> FORWARD
  const frameB = new EthernetFrame({
    destMac: '00:00:00:00:00:01',
    sourceMac: '00:00:00:00:00:02',
    etherType: 0x0800
  });
  const res2 = sw.processFrame(frameB, 'Fa0/2');
  assert.equal(res2.action, 'FORWARD');
  assert.equal(res2.outputs.length, 1);
  assert.equal(res2.outputs[0].port, 'Fa0/1');
});

test('Device: Router маршрутизация (LPM) и декремент TTL', () => {
  const r1 = new RouterDevice('r1', 'Router-1');
  const eth0 = { name: 'Gig0/0', mac: '02:00:00:00:00:01', ip: '192.168.1.1', cidr: 24 };
  const eth1 = { name: 'Gig0/1', mac: '02:00:00:00:00:02', ip: '10.0.0.1', cidr: 30 };
  r1.addInterface(eth0);
  r1.addInterface(eth1);

  // Маршруты
  r1.addRoute('192.168.1.0', 24, null, 'Gig0/0');
  r1.addRoute('10.0.0.0', 30, null, 'Gig0/1');
  r1.addRoute('0.0.0.0', 0, '10.0.0.2', 'Gig0/1'); // Default route

  // Проверка LPM
  assert.equal(r1.lookupRoute('192.168.1.50').ifaceName, 'Gig0/0');
  assert.equal(r1.lookupRoute('10.0.0.2').ifaceName, 'Gig0/1');
  assert.equal(r1.lookupRoute('8.8.8.8').ifaceName, 'Gig0/1'); // упадет в 0.0.0.0/0

  // Маршрутизация пакета
  const packet = new IPv4Packet({
    sourceIp: '192.168.1.50',
    destIp: '8.8.8.8',
    ttl: 64,
    protocol: 1
  });
  const frame = new EthernetFrame({
    destMac: '02:00:00:00:00:01',
    sourceMac: '00:11:22:33:44:55',
    etherType: 0x0800,
    payload: packet
  });

  const routed = r1.processFrame(frame, 'Gig0/0');
  assert.equal(routed.action, 'ROUTED');
  assert.equal(routed.port, 'Gig0/1');
  assert.equal(routed.frame.payload.ttl, 63); // TTL уменьшился на 1!
  assert.equal(routed.frame.sourceMac, '02:00:00:00:00:02'); // MAC переписан на исходящий интерфейс роутера!
});
