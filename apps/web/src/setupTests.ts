// Jest/jsdom doesn't implement scrollTo; components may call it on mount.
Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});

