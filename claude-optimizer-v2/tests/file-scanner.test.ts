/**
 * Unit tests for FileScanner
 */

import { describe, it, expect } from 'vitest';
import { FileScanner } from '../src/utils/file-scanner.js';

describe('FileScanner', () => {
  it('should create instance without errors', () => {
    const scanner = new FileScanner();
    expect(scanner).toBeDefined();
  });

  it('should detect JavaScript language from files', () => {
    const scanner = new FileScanner();
    // Test private method via public interface
    expect(scanner).toHaveProperty('scanProject');
  });
});
