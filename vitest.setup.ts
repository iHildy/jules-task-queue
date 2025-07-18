import { vi } from 'vitest';

vi.mock('@/server/db', () => ({
  db: {
    julesTask: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/github', () => ({
  githubClient: {
    getIssue: vi.fn(),
    swapLabels: vi.fn(),
  },
}));
