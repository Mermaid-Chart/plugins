import { describe, expect, it } from 'vitest';
import { extractFrontMatter } from './frontmatter.js';

describe('extractFrontMatter()', () => {
  it(String.raw`should handle \r\n (␍␊)`, () => {
    const text = '---\r\nid: test\r\n---\r\ninfo\r\n';
    const result = extractFrontMatter(text);
    expect(result.metadata.id).toBe('test');
  });
});
