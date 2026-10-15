// Wire-level regression tests; no Bluetooth hardware required.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function setup() {
  let extension;
  let hub;
  const source = fs.readFileSync(new URL('../extensions/CrispStrobe/lego_wedo2_universal.js', import.meta.url), 'utf8');
  const writes = [];
  const runtime = {registerPeripheralExtension(id, instance) { hub = instance; }, on() {}};
  const context = vm.createContext({
    console: {log() {}, info() {}, debug() {}, warn() {}, error() {}, group() {}, groupEnd() {}},
    setTimeout: fn => { fn(); return 1; }, clearTimeout() {},
    Scratch: {Cast: {toNumber: value => Number(value) || 0}, vm: {runtime}, extensions: {register(e) { extension = e; }},
      BlockType: {COMMAND: 'command', BOOLEAN: 'Boolean', REPORTER: 'reporter', HAT: 'hat'},
      ArgumentType: {NUMBER: 'number', STRING: 'string'}},
  });
  vm.runInContext(source, context);
  extension._connectionType = 'invalid-test-transport';
  // scan() is unnecessary: intercept hub registration before transport creation.
  const pending = extension.connect().catch(() => {});
  await pending;
  assert.ok(hub);
  hub._connection = {isConnected: () => true, send: async (uuid, bytes) => writes.push({uuid, bytes: Array.from(bytes)})};
  extension._hub = hub;
  return {extension, hub, writes, pending};
}

const packets = writes => writes.map(w => w.bytes);

test('88005 A/B/ALL brightness uses raw light bytes, even when limiter denies every command', async () => {
  const {extension, hub, writes} = await setup();
  hub._handleAttachedIO([1, 1, 0, 8]);
  hub._handleAttachedIO([2, 1, 0, 8]);
  hub._rateLimiter.okayToSend = () => false;
  await extension.setLightBrightness({PORT: 'ALL', BRIGHTNESS: 25});
  await extension.lightOff({PORT: 'B'});
  assert.deepEqual(packets(writes), [[1, 1, 2, 25], [2, 1, 2, 25], [2, 1, 2, 0]]);
  assert.ok(writes.every(w => w.uuid === '00001565-1212-efde-1523-785feabcd123'));
});

test('brightness clamps and rounds without applying the motor minimum', async () => {
  const {extension, writes} = await setup();
  for (const brightness of [1, -1, 999, 12.7, '50', NaN]) {
    await extension.setLightBrightness({PORT: 'A', BRIGHTNESS: brightness});
  }
  assert.deepEqual(packets(writes).map(p => p[3]), [1, 0, 100, 13, 50, 0]);
});

test('known motors and sensors cannot be driven as lights; light cannot be driven as motor', async () => {
  const {extension, hub, writes} = await setup();
  for (const type of [1, 34, 35, 23, 99]) {
    hub._handleAttachedIO([1, 1, 0, type]);
    await extension.setLightBrightness({PORT: 'A', BRIGHTNESS: 100});
    assert.equal(hub.getLight(1), null);
  }
  // Sensor setup writes configuration, never light power.
  assert.ok(writes.every(w => w.uuid !== '00001565-1212-efde-1523-785feabcd123'));
  hub._handleAttachedIO([1, 1, 0, 8]);
  assert.equal(hub.getMotor(1), null);
  assert.equal(hub.getLight(6), null);
});

test('unannounced ports work, later announcements win, and stop-all switches off both lights', async () => {
  const {extension, hub, writes} = await setup();
  await extension.setLightBrightness({PORT: 'ALL', BRIGHTNESS: 100});
  await hub.stopAll();
  assert.deepEqual(packets(writes), [[1, 1, 2, 100], [2, 1, 2, 100], [1, 1, 2, 0], [2, 1, 2, 0]]);
  hub._handleAttachedIO([1, 0]);
  hub._handleAttachedIO([1, 1, 0, 1]);
  assert.equal(hub.getLight(1), null);
});

test('disconnected and invalid port commands send nothing', async () => {
  const {extension, hub, writes} = await setup();
  await extension.setLightBrightness({PORT: '6', BRIGHTNESS: 100});
  hub._connection.isConnected = () => false;
  await extension.lightOff({PORT: 'ALL'});
  assert.deepEqual(writes, []);
});
