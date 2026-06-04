import { Project, SyntaxKind, Node } from "ts-morph";
import * as fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths(["src/pages/messages.tsx"]);
const files = project.getSourceFiles();

const strings: Record<string, string> = {};

function generateKey(text: string) {
  const clean = text.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  let key = clean.split(' ').map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
  if (key.length > 30) key = key.substring(0, 30);
  if (!key) key = "autoKey_" + Math.floor(Math.random() * 1000);
  return key;
}

for (const sourceFile of files) {
  let modified = false;
  console.log("Processing", sourceFile.getFilePath());

  // We need to collect nodes first to avoid messing up the AST iteration when we replace things
  const textNodesToReplace: Array<{node: Node, text: string, prefix: string, suffix: string, key: string, orig: string}> = [];
  const attrNodesToReplace: Array<{node: Node, text: string, key: string}> = [];

  sourceFile.forEachDescendant(node => {
    if (Node.isJsxText(node)) {
      const text = node.getText();
      const trimmed = text.trim();
      // Look for significant english text that isn't just symbols or empty space
      if (trimmed.length > 1 && /[a-zA-Z]/.test(trimmed) && !trimmed.includes('{t(')) {
        const key = generateKey(trimmed);
        strings[key] = trimmed;
        
        const beforeMatch = text.match(/^\s*/);
        const afterMatch = text.match(/\s*$/);
        const spaceBefore = beforeMatch ? beforeMatch[0] : "";
        const spaceAfter = afterMatch ? afterMatch[0] : "";
        
        textNodesToReplace.push({
            node, 
            text: trimmed, 
            prefix: spaceBefore, 
            suffix: spaceAfter,
            key,
            orig: text
        });
      }
    }
    
    if (Node.isJsxAttribute(node)) {
      const name = node.getNameNode().getText();
      if (["placeholder", "label", "title", "tooltip", "alt"].includes(name)) {
        const initializer = node.getInitializer();
        if (initializer && Node.isStringLiteral(initializer)) {
            const text = initializer.getLiteralText();
            const trimmed = text.trim();
            if (trimmed.length > 1 && /[a-zA-Z]/.test(trimmed)) {
                const key = generateKey(trimmed);
                strings[key] = trimmed;
                attrNodesToReplace.push({
                    node: initializer,
                    text: trimmed,
                    key
                });
            }
        }
      }
    }
  });

  // Apply replacements in reverse order of position so we don't invalidate node positions!
  const allReplacements = [
    ...textNodesToReplace.map(x => ({ pos: x.node.getPos(), apply: () => {
        // Double check it's still a valid node
        try {
            x.node.replaceWithText(`${x.prefix}{t('auto.${x.key}', \`${x.text.replace(/`/g, '\\`')}\`)}${x.suffix}`);
            modified = true;
        } catch(e) {}
    }})),
    ...attrNodesToReplace.map(x => ({ pos: x.node.getPos(), apply: () => {
        try {
            x.node.replaceWithText(`{t('auto.${x.key}', \`${x.text.replace(/`/g, '\\`')}\`)}`);
            modified = true;
        } catch(e) {}
    }}))
  ].sort((a, b) => b.pos - a.pos);

  for (const rep of allReplacements) {
      rep.apply();
  }

  if (modified) {
    let hasImport = false;
    sourceFile.getImportDeclarations().forEach(imp => {
      if (imp.getModuleSpecifierValue() === 'react-i18next' || imp.getModuleSpecifierValue() === 'next-i18next') {
        hasImport = true;
        const hasNamed = imp.getNamedImports().some(n => n.getName() === 'useTranslation');
        if (!hasNamed) {
            imp.addNamedImport('useTranslation');
        }
      }
    });

    if (!hasImport) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: 'next-i18next',
        namedImports: ['useTranslation']
      });
    }

    // Try to inject const { t } = useTranslation('common');
    // Find functional components (FunctionDeclaration or VariableDeclaration with ArrowFunction)
    const functionDeclarations = sourceFile.getFunctions();
    const variableDeclarations = sourceFile.getVariableDeclarations();
    
    const components = [];
    
    for (const func of functionDeclarations) {
        if (func.getName() && /^[A-Z]/.test(func.getName() || "")) {
            components.push(func);
        } else if (func.isDefaultExport()) {
            components.push(func);
        }
    }
    
    for (const v of variableDeclarations) {
        if (/^[A-Z]/.test(v.getName())) {
            const init = v.getInitializer();
            if (init && Node.isArrowFunction(init)) {
                components.push(init);
            }
        }
    }

    for (const comp of components) {
        let body;
        if (Node.isFunctionDeclaration(comp)) {
            body = comp.getBody();
        } else if (Node.isArrowFunction(comp)) {
            body = comp.getBody();
            if (!Node.isBlock(body)) {
                // It's a shorthand arrow function, we can't easily inject statements without converting to block.
                // We'll skip for now and I can fix manually.
                continue;
            }
        }
        
        if (body && Node.isBlock(body)) {
            if (!body.getText().includes('useTranslation')) {
                body.insertStatements(0, "const { t } = useTranslation('common');");
            }
        }
    }
    
    sourceFile.saveSync();
    console.log("Modified", sourceFile.getFilePath());
  }
}

fs.writeFileSync("scripts/extracted-strings.json", JSON.stringify(strings, null, 2));
console.log("Done extracting strings! Found", Object.keys(strings).length);
