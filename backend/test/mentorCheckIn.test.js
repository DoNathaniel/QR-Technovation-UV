'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readGeofence, validatePosition } = require('../src/utils/mentorCheckIn');
const fence = { latitude: -33, longitude: -71, radius: 150, maxAccuracy: 50 };
const now = Date.now();
const position = { latitude: -33, longitude: -71, accuracy: 10, timestamp: now };
test('geofence fails closed for missing or invalid configuration', () => {
  assert.equal(readGeofence({}), null);
  assert.equal(readGeofence({ MENTOR_CHECKIN_LATITUDE: ' ', MENTOR_CHECKIN_LONGITUDE: '-71', MENTOR_CHECKIN_RADIUS_METERS: '150', MENTOR_CHECKIN_MAX_ACCURACY_METERS: '50' }), null);
  assert.equal(validatePosition(position, null).ok, false);
});
test('accepts fresh precise location at campus and rejects far locations', () => {
  assert.equal(validatePosition(position, fence, now).ok, true);
  assert.equal(validatePosition({ ...position, latitude: -34 }, fence, now).ok, false);
});
test('rejects imprecise, stale, future and malformed positions', () => {
  for (const changes of [{ accuracy: 500 }, { accuracy: -1 }, { timestamp: now - 61000 }, { timestamp: now + 11000 }, { latitude: ' -33' }, { longitude: 181 }, { latitude: NaN }]) {
    assert.equal(validatePosition({ ...position, ...changes }, fence, now).ok, false);
  }
});
test('uncertainty must fit entirely inside radius', () => {
  assert.equal(validatePosition({ ...position, latitude: -33 + 140 / 111195, accuracy: 20 }, fence, now).ok, false);
});
