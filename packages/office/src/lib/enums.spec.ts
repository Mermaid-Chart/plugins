import { expect, it, describe } from 'vitest';
import { isEnumValue, validateEnumValue } from './enums';

describe('enum values can be verified', () => {
  enum TestEnum {
    One = 'one',
    Two = 'two'
  }

  it('should return if value is in enum', () => {
    expect(TestEnum.One).toBe('one');
    expect(isEnumValue(TestEnum, 'one')).toBe(true);
    expect(isEnumValue(TestEnum, 'two')).toBe(true);
    expect(isEnumValue(TestEnum, 'three')).toBe(false);
  });

  it('should return value if value is in enum', () => {
    expect(validateEnumValue(TestEnum, 'one')).toBe('one');
    expect(validateEnumValue(TestEnum, 'two')).toBe('two');
  });

  it('should throw if value is not in enum', () => {
    expect(() => validateEnumValue(TestEnum, 'One')).toThrowErrorMatchingInlineSnapshot(
      '"Invalid enum value: \'One\' for enum [one, two]"'
    );
    expect(() => validateEnumValue(TestEnum, 'three')).toThrowErrorMatchingInlineSnapshot(
      '"Invalid enum value: \'three\' for enum [one, two]"'
    );
  });
});
