/// <reference types="vitest" />
/// <reference types="vitest/globals" />

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toHaveClass(className: string): R;
  toHaveTextContent(text: string): R;
}

declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining extends CustomMatchers {}
  }
  
  namespace Vitest {
    interface Assertion<T = any> extends CustomMatchers<T> {}
    interface AsymmetricMatchersContaining extends CustomMatchers {}
  }
}