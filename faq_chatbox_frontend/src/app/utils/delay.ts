export const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    const fn = (globalThis as any)?.setTimeout ?? ((cb: () => void, t: number) => { /* no-op for non-browser SSR */ });
    fn(() => resolve(), ms);
  });
