import { shallowEqual } from '../../utils/object-comparison';

describe('shallowEqual', () => {
  it('should return true for identical object references', () => {
    const obj = { a: 1, b: 2 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('should return true for objects with same keys and primitive values', () => {
    const obj1 = { a: 1, b: 'test', c: true };
    const obj2 = { a: 1, b: 'test', c: true };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for objects with different values', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should return false for objects with different keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should return false for objects with different number of keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2, c: 3 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should handle empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it('should handle undefined values correctly', () => {
    const obj1 = { a: undefined, b: 2 };
    const obj2 = { a: undefined, b: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false when one has a key and the other does not', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 1, b: undefined };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should handle null values', () => {
    const obj1 = { a: null, b: 2 };
    const obj2 = { a: null, b: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for nested objects with same structure but different references', () => {
    const obj1 = { a: { nested: 1 } };
    const obj2 = { a: { nested: 1 } };
    // Shallow comparison should return false because nested objects have different references
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should return true for nested objects with same reference', () => {
    const nested = { value: 1 };
    const obj1 = { a: nested };
    const obj2 = { a: nested };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should handle boolean values', () => {
    const obj1 = { enabled: true, disabled: false };
    const obj2 = { enabled: true, disabled: false };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false when boolean values differ', () => {
    const obj1 = { enabled: true };
    const obj2 = { enabled: false };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should handle numeric zero correctly', () => {
    const obj1 = { value: 0 };
    const obj2 = { value: 0 };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should distinguish between 0 and -0', () => {
    const obj1 = { value: 0 };
    const obj2 = { value: -0 };
    // In JavaScript, 0 === -0, so this should be true
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should handle string values with special characters', () => {
    const obj1 = { text: 'hello\nworld\t!' };
    const obj2 = { text: 'hello\nworld\t!' };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });
});
