import fs from "node:fs/promises";
import path from "node:path";
// TS 7 ships no classic Compiler API; use the side-by-side TS 6 package.
import ts from "@typescript/typescript6";

const REPO_ROOT = process.cwd();
const CONVEX_DIR = path.join(REPO_ROOT, "convex");
const AUTH_PATTERNS = [
  /\bctx\.auth\.getUserIdentity\s*\(/,
  /\brequireClerkUserId\s*\(/,
  /\benforceRateLimit\s*\(/,
];

async function listTypeScriptFiles(targetDir) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_generated") {
          return [];
        }
        return await listTypeScriptFiles(fullPath);
      }
      if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
        return [];
      }
      return [fullPath];
    }),
  );
  return files.flat();
}

function isPublicMutationDeclaration(node) {
  if (!ts.isVariableDeclaration(node) || !node.initializer) {
    return false;
  }
  if (!ts.isCallExpression(node.initializer)) {
    return false;
  }
  if (!ts.isIdentifier(node.initializer.expression)) {
    return false;
  }
  return node.initializer.expression.text === "mutation";
}

function isExportedConst(node) {
  return (
    ts.isVariableStatement(node) &&
    node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function handlerSourceText(sourceFile, declaration) {
  if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
    return null;
  }
  const [options] = declaration.initializer.arguments;
  if (!options || !ts.isObjectLiteralExpression(options)) {
    return null;
  }
  const handlerProperty = options.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "handler",
  );
  if (!handlerProperty || !ts.isPropertyAssignment(handlerProperty)) {
    return null;
  }
  return handlerProperty.initializer.getText(sourceFile);
}

function hasAuthGuard(handlerText) {
  return AUTH_PATTERNS.some((pattern) => pattern.test(handlerText));
}

const issues = [];
const files = await listTypeScriptFiles(CONVEX_DIR);

for (const filePath of files) {
  const sourceText = await fs.readFile(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  for (const statement of sourceFile.statements) {
    if (!isExportedConst(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!isPublicMutationDeclaration(declaration)) {
        continue;
      }

      const handlerText = handlerSourceText(sourceFile, declaration);
      if (!handlerText || hasAuthGuard(handlerText)) {
        continue;
      }

      const name = ts.isIdentifier(declaration.name) ? declaration.name.text : "<unknown>";
      const { line } = sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile));
      issues.push(`${path.relative(REPO_ROOT, filePath)}:${line + 1} public mutation "${name}" lacks auth helper usage`);
    }
  }
}

if (issues.length > 0) {
  console.error("Convex auth check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Convex auth check passed.");
