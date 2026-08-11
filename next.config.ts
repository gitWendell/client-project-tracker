import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next generates AGENTS.md/CLAUDE.md on dev by default; this repo does not
  // need them, and they only add noise to the diff.
  agentRules: false,

  /**
   * The assessment specifies the routes as `/projects` and `/projects/:id`,
   * while Next's convention places route handlers under `/api`. These rewrites
   * serve the canonical paths from the spec without duplicating any code, so
   * both `GET /projects/1` and `GET /api/projects/1` work.
   */
  async rewrites() {
    return [
      { source: '/projects', destination: '/api/projects' },
      { source: '/projects/:id', destination: '/api/projects/:id' },
    ];
  },
};

export default nextConfig;
