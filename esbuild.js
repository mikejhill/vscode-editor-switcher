const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Manages syncing of package.nls*.json files from i18n/ to extension root.
 */
class NlsSync {
  constructor() {
    this.root = process.cwd();
    this.i18nDir = path.join(this.root, "i18n");
    this.syncedFiles = [];
  }

  /**
   * Syncs package.nls*.json from i18n/ to extension root.
   * @returns {string[]} Array of synced file paths
   */
  syncPackageNls() {
    if (!fs.existsSync(this.i18nDir)) {
      console.error(`[sync-nls] Source directory not found: ${this.i18nDir}`);
      return [];
    }

    const files = fs
      .readdirSync(this.i18nDir)
      .filter(
        (name) => name.startsWith("package.nls") && name.endsWith(".json"),
      );

    this.syncedFiles = [];
    for (const file of files) {
      const from = path.join(this.i18nDir, file);
      const to = path.join(this.root, file);
      fs.copyFileSync(from, to);
      this.syncedFiles.push(to);
    }
    console.log(`[sync-nls] synced ${files.length} file(s)`);
    return this.syncedFiles;
  }

  /**
   * Syncs all NLS resources.
   */
  syncAll() {
    this.syncPackageNls();
  }

  /**
   * Removes synced package.nls*.json files from extension root.
   */
  cleanup() {
    for (const filePath of this.syncedFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`[sync-nls] Failed to delete ${filePath}:`, err.message);
      }
    }
    console.log(`[sync-nls] cleaned up ${this.syncedFiles.length} file(s)`);
    this.syncedFiles = [];
  }

  /**
   * Watches i18n directory for changes and auto-syncs.
   */
  watch() {
    // Watch package.nls*.json in i18n/
    if (fs.existsSync(this.i18nDir)) {
      fs.watch(this.i18nDir, { recursive: true }, (event, filename) => {
        if (
          filename &&
          filename.startsWith("package.nls") &&
          filename.endsWith(".json")
        ) {
          console.log(`[sync-nls] detected change: ${filename}`);
          this.syncPackageNls();
        }
      });
    }
  }

  /**
   * Creates an esbuild plugin for NLS syncing.
   * @returns {import('esbuild').Plugin}
   */
  createPlugin() {
    return {
      name: "sync-nls",

      setup: (build) => {
        build.onStart(() => {
          this.syncAll();
        });

        // Clean up in non-watch mode
        if (!watch) {
          build.onEnd(() => {
            this.cleanup();
          });
        }

        // Watch directories for changes in watch mode
        if (watch) {
          this.watch();

          // Clean up on exit
          process.on("SIGINT", () => {
            this.cleanup();
            process.exit(0);
          });
        }
      },
    };
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  const nlsSync = new NlsSync();
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
      nlsSync.createPlugin(),
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
