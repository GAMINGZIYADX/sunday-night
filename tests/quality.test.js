import { describe, it, expect } from 'vitest';
import { pickQuality } from '../src/engine/quality.js';

// What 'auto' graphics picks. Phones: WebGL renderer names as Android Chrome
// reports them.
const phone = (gpu, memory = 4) => pickQuality({ gpu, webgl2: true, cores: 8, memory });

describe('auto graphics quality', () => {
  it('gives mid-range phones the full look', () => {
    expect(phone('Adreno (TM) 618')).toBe('full'); // Redmi Note 12 Pro 4G
    expect(phone('Adreno (TM) 619')).toBe('full');
    expect(phone('Adreno (TM) 642L')).toBe('full');
    expect(phone('Adreno (TM) 730', 8)).toBe('full');
    expect(phone('Mali-G68 MC4')).toBe('full');
    expect(phone('Mali-G610 MC6')).toBe('full');
  });

  it('keeps weak and old chips on light graphics', () => {
    expect(phone('Adreno (TM) 610')).toBe('light');
    expect(phone('Adreno (TM) 506')).toBe('light');
    expect(phone('Adreno (TM) 320')).toBe('light');
    expect(phone('Mali-400 MP')).toBe('light');
    expect(phone('Mali-G52 MC2')).toBe('light');
    expect(phone('PowerVR SGX 544MP')).toBe('light');
    expect(phone('Adreno (TM) 618', 2)).toBe('light'); // a good chip but 2 GB
  });

  it('uses light graphics without WebGL 2', () => {
    expect(pickQuality({ gpu: 'Adreno (TM) 618', webgl2: false, cores: 8, memory: 8 })).toBe('light');
  });

  it('judges computers as before', () => {
    expect(pickQuality({ gpu: 'ANGLE (NVIDIA GeForce RTX 3060)', webgl2: true, cores: 12, memory: 8 })).toBe('full');
    expect(pickQuality({ gpu: 'ANGLE (Intel(R) UHD Graphics 620)', webgl2: true, cores: 8, memory: 8 })).toBe('light');
    expect(pickQuality({ gpu: 'ANGLE (AMD Radeon RX 580)', webgl2: true, cores: 4, memory: 8 })).toBe('light');
  });
});
