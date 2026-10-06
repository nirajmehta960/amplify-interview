import { vi } from "vitest";

/**
 * jsdom has no `matchMedia`. `reduced` answers the prefers-reduced-motion query;
 * every other query reports false.
 */
export function mockMatchMedia({ reduced = false }: { reduced?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

/**
 * jsdom has no `IntersectionObserver`. This one records what it observes so a
 * test can declare "this element is now on screen" with `fire()`. Wrap `fire`
 * in `act()` when it causes a React state update.
 */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly targets = new Set<Element>();
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (target: Element) => {
    this.targets.add(target);
  };

  unobserve = (target: Element) => {
    this.targets.delete(target);
  };

  disconnect = () => {
    this.targets.clear();
  };

  takeRecords = () => [];

  static fire(target: Element, isIntersecting: boolean) {
    for (const observer of MockIntersectionObserver.instances) {
      if (!observer.targets.has(target)) continue;
      const entry = {
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
      } as IntersectionObserverEntry;
      observer.callback([entry], observer as unknown as IntersectionObserver);
    }
  }
}

export function installIntersectionObserver() {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
}
