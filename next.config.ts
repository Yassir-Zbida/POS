import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));

/**
 * Optional: if the dev server logs "Blocked cross-origin request … to /_next/*" when you open
 * the app via a LAN or VPN IP, set in `.env.local`:
 *   NEXT_DEV_EXTRA_ORIGINS=127.0.0.1,192.168.1.10,127.201.253.58
 * (comma-separated hostnames only, no `http://` or ports — match the browser’s hostname.)
 */
const devExtraOrigins =
  process.env.NODE_ENV === "development" && process.env.NEXT_DEV_EXTRA_ORIGINS
    ? process.env.NEXT_DEV_EXTRA_ORIGINS.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

const nextConfig: NextConfig = {
  ...(devExtraOrigins?.length ? { allowedDevOrigins: devExtraOrigins } : {}),
  // Prevent `next build` and `next dev` from fighting over the same `.next` directory
  // when both are running at the same time.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Nodemailer is Node-only; keep it external so Webpack does not try to bundle it incorrectly.
  serverExternalPackages: ["nodemailer"],
  experimental: {
    // Workaround for occasional dev-only crashes:
    // "Could not find the module ...segment-explorer-node.js#SegmentViewNode in the React Client Manifest"
    devtoolSegmentExplorer: false,
  },
  // `date-fns` v4 `exports` can make Webpack miss `import "date-fns/locale"`. `react-day-picker`
  // (DayPicker) pulls that in internally — only fix that, without rewriting `react-day-picker/*`
  // to absolute disk paths (breaks pnpm / Docker when files sit under `.pnpm/`).
  webpack: (config, { webpack: webpackInstance }) => {
    const dateFnsLocaleFile = requireFromProject.resolve("date-fns/locale");
    const alias = (config.resolve?.alias ?? {}) as Record<string, string | false | string[]>;
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...alias,
      "date-fns/locale": dateFnsLocaleFile,
    };
    config.plugins = config.plugins ?? [];
    config.plugins.push(
      new webpackInstance.NormalModuleReplacementPlugin(/^date-fns\/locale$/, dateFnsLocaleFile)
    );
    return config;
  },
  transpilePackages: ["date-fns", "react-day-picker"],
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
