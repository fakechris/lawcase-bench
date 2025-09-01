/**
 * Unit tests for index.js
 */

import { add, subtract, multiply, divide, Calculator, main } from '../index.js';

describe('Math Functions', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('should add zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    it('should handle negative results', () => {
      expect(subtract(3, 5)).toBe(-2);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it('should handle multiplication by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(multiply(-3, 4)).toBe(-12);
      expect(multiply(-3, -4)).toBe(12);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('should handle decimal results', () => {
      expect(divide(7, 2)).toBe(3.5);
    });

    it('should throw error for division by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero');
    });
  });
});

describe('Calculator Class', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it('should initialize with zero', () => {
    expect(calculator.getResult()).toBe(0);
  });

  it('should chain operations', () => {
    const result = calculator.add(10).multiply(2).subtract(5).getResult();

    expect(result).toBe(15);
  });

  it('should handle divide operation', () => {
    const result = calculator.add(20).divide(4).getResult();

    expect(result).toBe(5);
  });

  it('should clear result', () => {
    calculator.add(10);
    expect(calculator.getResult()).toBe(10);

    calculator.clear();
    expect(calculator.getResult()).toBe(0);
  });

  it('should return this for chaining', () => {
    expect(calculator.add(5)).toBe(calculator);
    expect(calculator.subtract(2)).toBe(calculator);
    expect(calculator.multiply(3)).toBe(calculator);
    expect(calculator.divide(1)).toBe(calculator);
    expect(calculator.clear()).toBe(calculator);
  });
});

describe('Main Function', () => {
  let originalLog;
  let logCalls;

  beforeEach(() => {
    originalLog = console.log;
    logCalls = [];
    // eslint-disable-next-line no-console
    console.log = (...args) => {
      logCalls.push(args);
    };
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.log = originalLog;
  });

  it('should execute calculations correctly', () => {
    const result = main();

    // (0 + 10) * 2 - 5 / 3 = (10 * 2 - 5) / 3 = 15 / 3 = 5
    expect(result).toBe(5);
  });

  it('should log output', () => {
    main();

    expect(logCalls).toContainEqual(['Calculator Demo']);
    expect(logCalls).toContainEqual(['===============']);
    expect(logCalls).toContainEqual(['Result: 5']);
  });
});
