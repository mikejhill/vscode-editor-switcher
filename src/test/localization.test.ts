import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

/**
 * Extracts all %key% references from a JSON object recursively
 */
function extractLocalizationKeys(
  obj: any,
  keys: Set<string> = new Set(),
): Set<string> {
  if (typeof obj === "string") {
    const matches = obj.matchAll(/%([^%]+)%/g);
    for (const match of matches) {
      keys.add(match[1]);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractLocalizationKeys(item, keys);
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const value of Object.values(obj)) {
      extractLocalizationKeys(value, keys);
    }
  }
  return keys;
}

/**
 * Localization integrity tests
 * Automatically detects all localization keys from package.json
 * and validates completeness across all language packs.
 */
suite("Localization", () => {
  const repoRoot = path.resolve(__dirname, "../../");
  const packageJsonPath = path.join(repoRoot, "package.json");
  const baseFile = path.join(repoRoot, "package.nls.json");

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const baseJson = JSON.parse(fs.readFileSync(baseFile, "utf8"));

  const localeFiles = fs
    .readdirSync(repoRoot)
    .filter(
      (f) =>
        f.startsWith("package.nls.") &&
        f.endsWith(".json") &&
        f !== "package.nls.json",
    )
    .map((f) => path.join(repoRoot, f));

  // Automatically extract all localization keys from package.json
  const requiredKeys = extractLocalizationKeys(packageJson);

  test("should extract localization keys from package.json", () => {
    assert.ok(
      requiredKeys.size > 0,
      "Should find at least one localization key in package.json",
    );
    // Verify some known keys are present
    assert.ok(requiredKeys.has("command.open"), "Should find command.open key");
    assert.ok(
      requiredKeys.has("configuration.onCloseKeepGroupFocus.description"),
      "Should find configuration.onCloseKeepGroupFocus.description key",
    );
  });

  test("base package.nls.json should contain all required keys", () => {
    const missingKeys: string[] = [];
    for (const key of requiredKeys) {
      if (!(key in baseJson)) {
        missingKeys.push(key);
      }
    }
    assert.strictEqual(
      missingKeys.length,
      0,
      `Base package.nls.json is missing keys: ${missingKeys.join(", ")}`,
    );
  });

  test("all locale files should contain all required keys", () => {
    const issues: string[] = [];

    for (const file of localeFiles) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const filename = path.basename(file);

      for (const key of requiredKeys) {
        if (!(key in json)) {
          issues.push(`${filename}: missing key "${key}"`);
        } else if (typeof json[key] !== "string" || json[key].trim() === "") {
          issues.push(`${filename}: key "${key}" is empty or not a string`);
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Localization issues found:\n${issues.join("\n")}`,
    );
  });

  test("all locale files should localize strings (not equal to English)", () => {
    const issues: string[] = [];
    // Keys that are allowed to stay in English (brand names, etc.)
    const allowedEnglishKeys = new Set(["configuration.title"]);

    for (const file of localeFiles) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const filename = path.basename(file);

      for (const key of requiredKeys) {
        if (allowedEnglishKeys.has(key)) {
          continue; // Skip keys that are allowed to be in English
        }

        const english = baseJson[key];
        const localized = json[key];

        if (typeof localized === "string" && localized === english) {
          issues.push(
            `${filename}: key "${key}" is not translated (matches English)`,
          );
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Untranslated strings found:\n${issues.join("\n")}`,
    );
  });

  test("should preserve brand name 'Editor Switcher' in command labels", () => {
    const brandKeys = ["command.open", "command.closeSelected"];
    const issues: string[] = [];

    for (const file of localeFiles) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const filename = path.basename(file);

      for (const key of brandKeys) {
        const val = json[key];
        if (typeof val !== "string" || val.length === 0) {
          issues.push(`${filename}: key "${key}" is missing or empty`);
        } else if (!val.includes("Editor Switcher")) {
          issues.push(
            `${filename}: key "${key}" must contain 'Editor Switcher'`,
          );
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Brand name validation failed:\n${issues.join("\n")}`,
    );
  });

  test("should have no extra keys in locale files", () => {
    const issues: string[] = [];

    for (const file of localeFiles) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const filename = path.basename(file);

      for (const key of Object.keys(json)) {
        if (!requiredKeys.has(key)) {
          issues.push(
            `${filename}: unexpected key "${key}" (not in package.json)`,
          );
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Extra keys found:\n${issues.join("\n")}`,
    );
  });
});
