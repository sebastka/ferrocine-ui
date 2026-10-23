import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ago, bitrate, bytes, channels, clock, episodeCode, resolution, runtime } from '../src/logic/format.ts';

test('clock', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(61_000), '1:01');
  assert.equal(clock(3_723_400), '1:02:03');
  assert.equal(clock(-5), '0:00');
  assert.equal(clock(Number.NaN), '0:00');
});

test('runtime', () => {
  assert.equal(runtime(null), null);
  assert.equal(runtime(42 * 60_000), '42 min');
  assert.equal(runtime(102 * 60_000), '1 h 42 min');
  assert.equal(runtime(120 * 60_000), '2 h');
});

test('bytes and bitrate', () => {
  assert.equal(bytes(512), '512 B');
  assert.equal(bytes(1_234_567_890), '1.2 GB');
  assert.equal(bytes(640_000_000), '640 MB');
  assert.equal(bitrate(8_500_000), '8.5 Mb/s');
  assert.equal(bitrate(640_000), '640 kb/s');
  assert.equal(bitrate(null), null);
});

test('episode code, channels, resolution', () => {
  assert.equal(episodeCode(1, 2), 'S01E02');
  assert.equal(episodeCode(null, 2), null);
  assert.equal(channels(6), '5.1');
  assert.equal(channels(3), '3 ch');
  assert.equal(resolution(3840, 1600), '4K');
  assert.equal(resolution(1920, 800), '1080p');
  assert.equal(resolution(1280, 720), '720p');
  assert.equal(resolution(720, 480), '480p');
});

test('ago', () => {
  const now = 1_000_000_000;
  assert.equal(ago(null, now), 'never');
  assert.equal(ago(now - 10_000, now), 'just now');
  assert.equal(ago(now - 3 * 60_000, now), '3 minutes ago');
  assert.equal(ago(now - 3600_000, now), '1 hour ago');
  assert.equal(ago(now - 2 * 86_400_000, now), '2 days ago');
});
