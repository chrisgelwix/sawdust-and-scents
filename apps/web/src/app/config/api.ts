export function getApiBaseUrl(): string {
  const fromWindow =
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__env &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__env.VITE_API_URL;

  const normalize = (base: string) => {
    const trimmed = base.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };

  if (typeof fromWindow === 'string' && fromWindow.trim()) return normalize(fromWindow);

  const fromProcess =
    typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_API_URL || process.env.NX_PUBLIC_API_URL);

  if (typeof fromProcess === 'string' && fromProcess.trim()) return normalize(fromProcess);

  return 'http://localhost:3000/api';
}

