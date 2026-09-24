import { describe, it, expect } from 'vitest';
import {
  serializeBundle,
  parseBundle,
  BundleParseError,
  BUNDLE_VERSION,
  type MapBundle,
} from './bundle';

const SAMPLE: MapBundle = {
  version: BUNDLE_VERSION,
  photoDataUrl: 'data:image/jpeg;base64,/9j/fakedata==',
  naturalWidth: 1024,
  naturalHeight: 768,
  pairs: [
    { pixel: { x: 100, y: 200 }, geo: { lat: 31.77, lon: 35.23 } },
    { pixel: { x: 300, y: 400 }, geo: { lat: 31.78, lon: 35.24 } },
    { pixel: { x: 500, y: 100 }, geo: { lat: 31.76, lon: 35.25 } },
  ],
};

describe('bundle', () => {
  it('round-trip: serialize then parse returns identical bundle', () => {
    const json = serializeBundle(SAMPLE);
    const result = parseBundle(json);
    expect(result).toEqual(SAMPLE);
  });

  it('throws on non-JSON input', () => {
    expect(() => parseBundle('not json{')).toThrow(BundleParseError);
    expect(() => parseBundle('not json{')).toThrow('Not valid JSON');
  });

  it('throws on wrong version', () => {
    const bad = JSON.stringify({ ...SAMPLE, version: 99 });
    expect(() => parseBundle(bad)).toThrow(BundleParseError);
    expect(() => parseBundle(bad)).toThrow('Unsupported bundle version: 99');
  });

  it('throws on missing photoDataUrl', () => {
    const { photoDataUrl: _, ...rest } = SAMPLE;
    expect(() => parseBundle(JSON.stringify(rest))).toThrow(BundleParseError);
  });

  it('throws on photoDataUrl that does not start with data:', () => {
    const bad = JSON.stringify({ ...SAMPLE, photoDataUrl: 'https://example.com/photo.jpg' });
    expect(() => parseBundle(bad)).toThrow(BundleParseError);
  });

  it('throws on missing naturalWidth', () => {
    const { naturalWidth: _, ...rest } = SAMPLE;
    expect(() => parseBundle(JSON.stringify(rest))).toThrow(BundleParseError);
  });

  it('throws on naturalHeight <= 0', () => {
    const bad = JSON.stringify({ ...SAMPLE, naturalHeight: 0 });
    expect(() => parseBundle(bad)).toThrow(BundleParseError);
  });

  it('throws on missing pairs', () => {
    const { pairs: _, ...rest } = SAMPLE;
    expect(() => parseBundle(JSON.stringify(rest))).toThrow(BundleParseError);
  });

  it('throws on malformed pair', () => {
    const bad = JSON.stringify({
      ...SAMPLE,
      pairs: [{ pixel: { x: 1 }, geo: { lat: 0, lon: 0 } }], // missing y
    });
    expect(() => parseBundle(bad)).toThrow(BundleParseError);
    expect(() => parseBundle(bad)).toThrow('pairs[0] has wrong shape');
  });
});