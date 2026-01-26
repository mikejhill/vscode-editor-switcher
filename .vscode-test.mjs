import { defineConfig } from "@vscode/test-cli";
import path from "path";

// Parse custom --vscode-test-output argument
// vscode-test changes CWD during execution, so we resolve relative paths early
const outputArgIndex = process.argv.indexOf("--vscode-test-output");
let outputPath = null;
if (outputArgIndex !== -1 && process.argv[outputArgIndex + 1]) {
  const rawPath = process.argv[outputArgIndex + 1];
  outputPath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
}

export default defineConfig({
  files: "out/test/**/*.test.js",
  mocha: outputPath
    ? {
        reporterOptions: {
          output: outputPath,
        },
      }
    : undefined,
});
