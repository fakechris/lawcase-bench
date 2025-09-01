/**
 * Main application entry point
 */

// Simple math functions for demonstration
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export function multiply(a, b) {
  return a * b;
}

export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

// Application class
export class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result = add(this.result, value);
    return this;
  }

  subtract(value) {
    this.result = subtract(this.result, value);
    return this;
  }

  multiply(value) {
    this.result = multiply(this.result, value);
    return this;
  }

  divide(value) {
    this.result = divide(this.result, value);
    return this;
  }

  clear() {
    this.result = 0;
    return this;
  }

  getResult() {
    return this.result;
  }
}

// Main function
export function main() {
  const calc = new Calculator();

  console.log('Calculator Demo');
  console.log('===============');

  const result = calc.add(10).multiply(2).subtract(5).divide(3).getResult();

  console.log(`Result: ${result}`);

  return result;
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
