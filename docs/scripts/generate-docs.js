import fs from 'fs/promises';
import path from 'path';

const DOCS_SRC_DIR = path.resolve(process.cwd(), './src');
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const BOT_SRC_DIR = path.resolve(PROJECT_ROOT, 'bot/src');

async function generateReadmePages(repoUrl) {
    const readmePath = path.resolve(PROJECT_ROOT, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    
    const packageJsonPath = path.resolve(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const version = packageJson.version || '1.0.0';
    const description = packageJson.description || 'A Discord bot with LLM capabilities';
    
    const allFiles = await getFiles(BOT_SRC_DIR, '.ts');
    const moduleCount = allFiles.length;
    
    const guideSidebar = { text: 'Guides', items: [], collapsed: false };
    const guideGroups = {
        'getting-started': { text: 'Getting Started', items: [] },
        'configuration': { text: 'Configuration', items: [] },
        'development': { text: 'Development', items: [] },
    };

    const heroContent = `---
layout: home

title: discordllmbot Documentation
titleTemplate: v${version}

hero:
  name: discordllmbot
  text: Documentation
  tagline: ${description}
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/
    - theme: alt
      text: View Source
      link: ${repoUrl ? repoUrl.replace(/\.git$/, '') : '#'}

features:
  - title: Getting Started
    details: Learn how to set up and run the bot
    link: /introduction/
  - title: API Reference
    details: ${moduleCount} modules documented with full API details
    link: /api/
  - title: Configuration
    details: Environment variables and settings
    link: /configuration/
  - title: Troubleshooting
    details: Common issues and solutions
    link: /troubleshooting/
---`;

    await fs.writeFile(path.join(DOCS_SRC_DIR, 'index.md'), heroContent);

    const sectionGroups = {
        'Introduction': 'getting-started',
        'Repository Layout': 'getting-started',
        'Features & Design': 'getting-started',
        'Configuration': 'configuration',
        'Environment Variables': 'configuration',
        'Running the Bot': 'getting-started',
        'Using Ollama Provider': 'configuration',
        'Key Implementation Notes': 'development',
        'Extending the Bot': 'development',
        'Troubleshooting': 'development',
        'Files to Inspect When Debugging': 'development',
    };

    const sections = readmeContent.split(/^## /m);
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.trim()) continue;
        
        let title, fileName, content;

        if (i === 0) {
            const firstNewline = section.indexOf('\n');
            const firstPart = firstNewline > 0 ? section.substring(0, firstNewline) : section;
            title = 'Introduction';
            fileName = 'introduction.md';
            content = section;
        } else {
            const titleMatch = section.match(/^(.*)/m);
            if (titleMatch) {
                const rawTitle = titleMatch[1].trim();
                title = rawTitle.replace(/\s*\(.*?\)\s*/g, '').trim();
                const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s/g, '-');
                fileName = sanitizedTitle + '.md';
                content = `## ${section}`;
            }
        }

        if (title && fileName) {
            await fs.writeFile(path.join(DOCS_SRC_DIR, fileName), content);
            const link = `/${fileName.replace('.md', '')}`;
            const groupKey = sectionGroups[title] || 'development';
            guideGroups[groupKey].items.push({ text: title, link });
        }
    }

    for (const group of Object.values(guideGroups)) {
        if (group.items.length > 0) {
            guideSidebar.items.push(group);
        }
    }
    
    return guideSidebar;
}

async function getFiles(dir, ext) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res, ext) : res;
    }));
    return Array.prototype.concat(...files).filter(f => f.endsWith(ext));
}

function parseJSDocBlock(content, startIndex) {
    const blockEnd = content.indexOf('*/', startIndex);
    if (blockEnd === -1) return null;
    
    const blockContent = content.substring(startIndex + 3, blockEnd);
    const lines = blockContent.split('\n');
    
    let description = '';
    const params = [];
    let returns = null;
    const throws = [];
    const see = [];
    let deprecated = null;
    let isInternal = false;
    const examples = [];
    let since = null;
    let author = null;
    let version = null;
    const requires = [];
    let readonly = false;
    let defaultValue = null;
    
    let inExample = false;
    let currentExample = [];
    let inDescription = true;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/^\s*\*\s?/, '').trim();
        
        if (line.startsWith('@example')) {
            inExample = true;
            inDescription = false;
            const exampleContent = line.replace('@example', '').replace(/^\s+/, '').trim();
            if (exampleContent) currentExample.push(exampleContent);
            continue;
        }
        
        if (inExample) {
            if (line.startsWith('@') || line === '') {
                if (currentExample.length > 0) {
                    examples.push(currentExample.join('\n'));
                    currentExample = [];
                }
                inExample = false;
                inDescription = true;
            } else {
                currentExample.push(line);
                continue;
            }
        }
        
        if (!line) {
            continue;
        }
        
        if (line.startsWith('@param')) {
            inDescription = false;
            const paramMatch = line.match(/@param\s+\{([^}]+)\}\s+(\w+)\s*(-?\s*(.*))?/);
            if (paramMatch) {
                params.push({
                    name: paramMatch[2],
                    type: paramMatch[1],
                    desc: paramMatch[4]?.trim() || ''
                });
            } else {
                const simpleMatch = line.match(/@param\s+(\w+)\s*-\s*(.*)/);
                if (simpleMatch) {
                    params.push({
                        name: simpleMatch[1],
                        type: 'any',
                        desc: simpleMatch[2]?.trim() || ''
                    });
                }
            }
        } else if (line.startsWith('@returns') || line.startsWith('@return')) {
            inDescription = false;
            let returnMatch = line.match(/@returns?\s+\{([^}]+)\}\s*(.*)/);
            if (!returnMatch) {
                returnMatch = line.match(/@returns?\s+(\S+)\s*(.*)/);
            }
            if (returnMatch) {
                returns = { type: returnMatch[1], desc: returnMatch[2]?.trim() || '' };
            }
        } else if (line.startsWith('@throws') || line.startsWith('@throw')) {
            inDescription = false;
            const throwsMatch = line.match(/@throws?\s+\{([^}]+)\}\s*(.*)/);
            if (throwsMatch) {
                throws.push({ type: throwsMatch[1], desc: throwsMatch[2]?.trim() || '' });
            }
        } else if (line.startsWith('@see')) {
            inDescription = false;
            const seeMatch = line.match(/@see\s+(.+)/);
            if (seeMatch) {
                see.push(seeMatch[1].trim());
            }
        } else if (line.startsWith('@deprecated')) {
            inDescription = false;
            deprecated = line.replace('@deprecated', '').trim() || 'This feature is deprecated';
        } else if (line.startsWith('@since')) {
            inDescription = false;
            since = line.replace('@since', '').trim();
        } else if (line.startsWith('@author')) {
            inDescription = false;
            author = line.replace('@author', '').trim();
        } else if (line.startsWith('@version')) {
            inDescription = false;
            version = line.replace('@version', '').trim();
        } else if (line.startsWith('@requires')) {
            inDescription = false;
            const requiresMatch = line.match(/@requires\s+(.+)/);
            if (requiresMatch) {
                requires.push(requiresMatch[1].trim());
            }
        } else if (line.startsWith('@internal')) {
            inDescription = false;
            isInternal = true;
        } else if (line.startsWith('@readonly')) {
            inDescription = false;
            readonly = true;
        } else if (line.startsWith('@default')) {
            inDescription = false;
            defaultValue = line.replace('@default', '').trim();
        } else if (!line.startsWith('@')) {
            if (inDescription) {
                description += (description ? '\n' : '') + line;
            }
        }
    }
    
    if (inExample && currentExample.length > 0) {
        examples.push(currentExample.join('\n'));
    }
    
    return {
        description: description.trim(),
        params,
        returns,
        throws,
        see,
        deprecated,
        examples,
        since,
        author,
        version,
        requires,
        isInternal,
        readonly,
        defaultValue
    };
}

function extractJSDoc(content) {
    const jsdocPositions = [];
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
    let jsdocMatch;
    
    while ((jsdocMatch = jsdocRegex.exec(content)) !== null) {
        jsdocPositions.push({
            start: jsdocMatch.index,
            end: jsdocMatch.index + jsdocMatch[0].length,
            jsdoc: jsdocMatch[1]
        });
    }
    
    const functions = [];
    const funcRegexGlobal = /(?:^|\n)(?:export\s+)?(async\s+)?function\s+(\w+)/gm;
    let funcMatch;
    const seenFuncs = new Set();
    
    while ((funcMatch = funcRegexGlobal.exec(content)) !== null) {
        const funcName = funcMatch[2];
        const isAsync = !!funcMatch[1];
        
        const reservedWords = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 
            'try', 'finally', 'throw', 'return', 'break', 'continue', 'new', 'delete', 
            'typeof', 'instanceof', 'void', 'yield', 'await', 'class', 'interface', 
            'type', 'enum', 'const', 'let', 'var', 'function', 'async', 'get', 'set',
            'import', 'export', 'from', 'default', 'static', 'public', 'private', 
            'protected', 'extends', 'implements', 'super', 'this', 'true', 'false', 
            'null', 'undefined', 'NaN', 'Infinity', 'in', 'of', 'with', 'to', 'as',
            'result', 'data', 'error', 'value', 'key', 'item', 'idx', 'i', 'j', 'k',
            'n', 'm', 'x', 'y', 'z', 'a', 'b', 'c', 'e', 'r', 's', 't', 'u', 'v', 'w'];
        
        if (reservedWords.includes(funcName) || seenFuncs.has(funcName)) continue;
        seenFuncs.add(funcName);
        
        const jsdoc = jsdocPositions.find(j => 
            j.end <= funcMatch.index && 
            (funcMatch.index - j.end < 50 || content.substring(j.end, funcMatch.index).trim().split('\n').length <= 2)
        );
        
        const parsed = jsdoc ? parseJSDocBlock(content, jsdoc.start) : null;
        
        functions.push({
            name: funcMatch[2],
            isAsync,
            start: funcMatch.index,
            end: funcMatch.index + funcMatch[0].length,
            description: parsed?.description || '',
            params: parsed?.params || [],
            returns: parsed?.returns || null,
            throws: parsed?.throws || [],
            see: parsed?.see || [],
            deprecated: parsed?.deprecated || null,
            examples: parsed?.examples || [],
            since: parsed?.since || null,
            author: parsed?.author || null,
            version: parsed?.version || null
        });
    }
    
    const classes = [];
    const classRegexGlobal = /export\s+class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g;
    let classMatch;
    
    while ((classMatch = classRegexGlobal.exec(content)) !== null) {
        const jsdoc = jsdocPositions.find(j => 
            j.end <= classMatch.index && 
            (classMatch.index - j.end < 50 || content.substring(j.end, classMatch.index).trim().split('\n').length <= 2)
        );
        
        const parsed = jsdoc ? parseJSDocBlock(content, jsdoc.start) : null;
        
        const classBodyStart = content.indexOf('{', classMatch.index);
        const classBody = content.substring(classBodyStart + 1, classBodyStart + 5000);
        
        const methodRegex = /(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g;
        const methods = [];
        let methodMatch;
        const seenMethods = new Set();
        
        while ((methodMatch = methodRegex.exec(classBody)) !== null) {
            const methodName = methodMatch[1];
            if (methodName === 'constructor' || methodName === 'if' || methodName === 'for' || 
                methodName === 'while' || methodName === 'switch' || methodName === 'catch' || 
                methodName === 'try' || methodName === 'else' || methodName === 'with' ||
                methodName === 'return' || methodName === 'throw' || methodName === 'yield' ||
                methodName === 'await' || methodName === 'new' || methodName === 'delete' ||
                methodName === 'typeof' || methodName === 'void' || methodName === 'null' ||
                methodName === 'true' || methodName === 'false' || methodName === 'in' ||
                methodName === 'of' || methodName === 'let' || methodName === 'const' ||
                methodName === 'var' || methodName === 'function' || methodName === 'class' ||
                methodName === 'interface' || methodName === 'type' || methodName === 'enum' ||
                methodName === 'async' || methodName === 'get' || methodName === 'set') continue;
            
            if (seenMethods.has(methodName)) continue;
            seenMethods.add(methodName);
            
            const methodStartInBody = methodMatch.index;
            const methodJsdocStart = content.lastIndexOf('/**', classBodyStart + methodStartInBody);
            const methodParsed = methodJsdocStart > classBodyStart ? parseJSDocBlock(content, methodJsdocStart) : null;
            
            methods.push({
                name: methodName,
                description: methodParsed?.description || '',
                params: methodParsed?.params || [],
                returns: methodParsed?.returns || null,
                throws: methodParsed?.throws || [],
                deprecated: methodParsed?.deprecated || null
            });
        }
        
        classes.push({
            name: classMatch[1],
            start: classMatch.index,
            description: parsed?.description || '',
            methods,
            throws: parsed?.throws || [],
            see: parsed?.see || [],
            deprecated: parsed?.deprecated || null
        });
    }
    
    const interfaces = [];
    const interfaceRegexGlobal = /export\s+interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{/g;
    let interfaceMatch;
    
    while ((interfaceMatch = interfaceRegexGlobal.exec(content)) !== null) {
        const start = interfaceMatch.index;
        const jsdoc = jsdocPositions.find(j => 
            j.end <= start && 
            (start - j.end < 50 || content.substring(j.end, start).trim().split('\n').length <= 2)
        );
        
        const parsed = jsdoc ? parseJSDocBlock(content, jsdoc.start) : null;
        
        const bodyStart = content.indexOf('{', start);
        const bodyEnd = findMatchingBrace(content, bodyStart);
        const interfaceBody = content.substring(bodyStart + 1, bodyEnd);
        
        const properties = [];
        const propLines = interfaceBody.split(';').filter(l => l.trim());
        
        for (const propLine of propLines) {
            const trimmed = propLine.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
            
            const propMatch = trimmed.match(/^(\w+)(?:\?)?\s*:\s*(.+?)(?:\s*=\s*)?$/);
            if (propMatch) {
                const [, name, type] = propMatch;
                let description = '';
                
                const propCommentStart = content.lastIndexOf('/**', start);
                const propCommentEnd = content.indexOf('*/', propCommentStart);
                if (propCommentStart > bodyStart && propCommentStart > start - 500) {
                    const commentContent = content.substring(propCommentStart + 3, propCommentEnd);
                    const descLines = commentContent.split('\n').filter(l => {
                        const clean = l.replace(/^\s*\*\s?/, '').trim();
                        return clean && !clean.startsWith('@');
                    });
                    description = descLines.join(' ').trim();
                }
                
                properties.push({ name, type: type.trim(), description });
            }
        }
        
        interfaces.push({
            name: interfaceMatch[1],
            description: parsed?.description || '',
            properties,
            extends: null
        });
    }
    
    const typeAliases = [];
    const typeRegexGlobal = /export\s+type\s+(\w+)\s*=\s*(.+?);/g;
    let typeMatch;
    
    while ((typeMatch = typeRegexGlobal.exec(content)) !== null) {
        const start = typeMatch.index;
        const jsdoc = jsdocPositions.find(j => 
            j.end <= start && 
            (start - j.end < 50 || content.substring(j.end, start).trim().split('\n').length <= 2)
        );
        
        const parsed = jsdoc ? parseJSDocBlock(content, jsdoc.start) : null;
        
        typeAliases.push({
            name: typeMatch[1],
            type: typeMatch[2].trim(),
            description: parsed?.description || ''
        });
    }
    
    const allItems = [...functions.map(f => ({ type: 'function', name: f.name })), 
                      ...classes.map(c => ({ type: 'class', name: c.name })),
                      ...interfaces.map(i => ({ type: 'interface', name: i.name })),
                      ...typeAliases.map(t => ({ type: 'type', name: t.name }))];
    
    return { functions, classes, interfaces, typeAliases, allItems };
}

function formatType(type) {
    if (!type) return 'any';
    let formatted = type
        .replace(/\|/g, ' | ')
        .replace(/&/g, ' & ')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (formatted.includes(' | ') || formatted.includes(' & ')) {
        const parts = formatted.split(/(?: \| | \& )/);
        formatted = parts.map(p => `\`${p.trim()}\``).join(formatted.includes(' | ') ? ' | ' : ' & ');
    } else {
        formatted = `\`${formatted}\``;
    }
    
    return formatted;
}

function extractModuleDoc(content) {
    const moduleRegex = /^\/\*\*([\s\S]*?)\*\/\s*import/m;
    const match = content.match(moduleRegex);
    if (!match) return null;
    
    const jsdocStart = match.index;
    return parseJSDocBlock(content, jsdocStart);
}

function findMatchingBrace(content, start) {
    let depth = 1;
    let i = start + 1;
    while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        i++;
    }
    return i - 1;
}

function generateCrossReference(itemName, allItems) {
    return ''; // Cross-references disabled - file-based structure doesn't support per-function links
}

async function generateApiDocs(repoUrl) {
    const REPO_URL = repoUrl ? repoUrl.replace(/\.git$/, '') : '#';
    const apiDocsDir = path.join(DOCS_SRC_DIR, 'api');
    await fs.mkdir(apiDocsDir, { recursive: true });

    const allFiles = await getFiles(BOT_SRC_DIR, '.ts');
    const apiSidebar = [];
    
    const groups = {
        'api': { text: 'API Server', items: [] },
        'core': { text: 'Core Logic', items: [] },
        'events': { text: 'Events', items: [] },
        'llm': { text: 'LLM Providers', items: [] },
        'memory': { text: 'Memory', items: [] },
        'personality': { text: 'Personality', items: [] },
        'strategies': { text: 'Strategies', items: [] },
        'utils': { text: 'Utilities', items: [] }
    };
    
    let indexContent = '# API Reference\n\nThis section contains the API documentation for the DiscordLLMBot source code.\n\n## Modules\n\n';

    let allItemsGlobal = [];

    for (const filePath of allFiles) {
        const relativePath = path.relative(BOT_SRC_DIR, filePath).replace(/\\/g, '/');
        let fileName = relativePath.replace(/[/\\]/g, '-').replace('.ts', '');
        if (!relativePath.includes('/')) {
            fileName = 'bot-' + fileName;
        }
        const dirName = relativePath.split('/')[0];
        const displayName = relativePath.replace('.ts', '');
        
        const content = await fs.readFile(filePath, 'utf-8');
        const { functions, classes, interfaces, typeAliases, allItems } = extractJSDoc(content);
        
        allItemsGlobal = [...allItemsGlobal, ...allItems];
    }

    for (const filePath of allFiles) {
        const relativePath = path.relative(BOT_SRC_DIR, filePath).replace(/\\/g, '/');
        let fileName = relativePath.replace(/[/\\]/g, '-').replace('.ts', '');
        if (!relativePath.includes('/')) {
            fileName = 'bot-' + fileName;
        }
        const dirName = relativePath.split('/')[0];
        const displayName = relativePath.replace('.ts', '');
        
        const content = await fs.readFile(filePath, 'utf-8');
        const { functions, classes, interfaces, typeAliases, allItems } = extractJSDoc(content);
        
        if (functions.length > 0 || classes.length > 0 || interfaces.length > 0 || typeAliases.length > 0) {
            const sortedFunctions = [...functions].filter(f => !f.isInternal).sort((a, b) => a.name.localeCompare(b.name));
            const sortedClasses = [...classes].filter(c => !c.isInternal).sort((a, b) => a.name.localeCompare(b.name));
            const sortedInterfaces = [...interfaces].sort((a, b) => a.name.localeCompare(b.name));
            const sortedTypes = [...typeAliases].sort((a, b) => a.name.localeCompare(b.name));
            
            let md = `# ${displayName}\n\n`;
            md += `**Source:** [\`${relativePath}\`](${REPO_URL}/blob/master/bot/src/${relativePath.replace('.ts', '.ts')})\n\n`;
            
            if (sortedInterfaces.length > 0) {
                md += `## Interfaces\n\n`;
                for (const iface of sortedInterfaces) {
                    md += `### ${iface.name}\n\n`;
                    if (iface.description) md += `${iface.description}\n\n`;
                    
                    if (iface.properties.length > 0) {
                        md += `**Properties:**\n\n`;
                        for (const prop of iface.properties) {
                            md += `- \`${prop.name}\` (${formatType(prop.type)})`;
                            if (prop.description) md += `: ${prop.description}`;
                            md += '\n';
                        }
                        md += '\n';
                    }
                    
                    if (iface.description) {
                        const crossRef = generateCrossReference(iface.name, allItemsGlobal);
                        if (crossRef) md += `\n${crossRef}\n\n`;
                    }
                }
            }
            
            if (sortedTypes.length > 0) {
                md += `## Type Aliases\n\n`;
                for (const type of sortedTypes) {
                    md += `### ${type.name}\n\n`;
                    md += `\`\`\`typescript\ntype ${type.name} = ${type.type};\n\`\`\`\n\n`;
                    if (type.description) md += `${type.description}\n\n`;
                    
                    const crossRef = generateCrossReference(type.name, allItemsGlobal);
                    if (crossRef) md += `\n${crossRef}\n\n`;
                }
            }
            
            if (sortedClasses.length > 0) {
                md += `## Classes\n\n`;
                for (const cls of sortedClasses) {
                    md += `### ${cls.name}\n\n`;
                    if (cls.description) md += `${cls.description}\n\n`;
                    
                    if (cls.deprecated) {
                        md += `> ⚠️ **Deprecated:** ${cls.deprecated}\n\n`;
                    }
                    
                    if (cls.methods.length > 0) {
                        md += `#### Methods\n\n`;
                        for (const method of cls.methods) {
                            md += `##### ${method.name}\n\n`;
                            if (method.description) md += `${method.description}\n\n`;
                            
                            if (method.params.length > 0) {
                                md += `**Parameters:**\n\n`;
                                for (const param of method.params) {
                                    const typeStr = param.type && param.type !== 'any' ? `(${formatType(param.type)}) ` : '';
                                    md += `- \`${param.name}\` ${typeStr}- ${param.desc || ' '}\n`.replace(/\s+- $/, '');
                                }
                                md += '\n';
                            }
                            
                            if (method.returns) {
                                md += `**Returns:** \`${method.returns.type}\``;
                                if (method.returns.desc) md += `: ${method.returns.desc}`;
                                md += '\n\n';
                            }
                            
                            if (method.throws.length > 0) {
                                md += `**Throws:**\n\n`;
                                for (const t of method.throws) {
                                    md += `- \`${t.type}\`${t.desc ? `: ${t.desc}` : ''}\n`;
                                }
                                md += '\n';
                            }
                            
                            if (method.deprecated) {
                                md += `> ⚠️ **Deprecated:** ${method.deprecated}\n\n`;
                            }
                        }
                    }
                    
                    const crossRef = generateCrossReference(cls.name, allItemsGlobal);
                    if (crossRef) md += `\n${crossRef}\n\n`;
                }
            }
            
            if (sortedFunctions.length > 0) {
                md += `## Functions\n\n`;
                
                const moduleDoc = extractModuleDoc(content);
                if (moduleDoc && moduleDoc.description) {
                    md += `*${moduleDoc.description}*\n\n`;
                }
                
                if (moduleDoc && moduleDoc.requires && moduleDoc.requires.length > 0) {
                    md += `**Requires:** \`${moduleDoc.requires.join(', ')}\`\n\n`;
                }
                
                for (const fn of sortedFunctions) {
                    const asyncBadge = fn.isAsync ? ' <span style="color: #ffa500">async</span>' : '';
                    md += `### ${fn.name}${asyncBadge}\n\n`;
                    if (fn.description) md += `${fn.description}\n\n`;
                    
                    if (fn.deprecated) {
                        md += `> ⚠️ **Deprecated:** ${fn.deprecated}\n\n`;
                    }
                    
                    if (fn.since || fn.author || fn.version) {
                        md += `*`;
                        if (fn.version) md += `v${fn.version} `;
                        if (fn.author) md += `by ${fn.author} `;
                        if (fn.since) md += `since ${fn.since}`;
                        md += `*\n\n`;
                    }
                    
                    if (fn.params.length > 0) {
                        md += `**Parameters:**\n\n`;
                        for (const param of fn.params) {
                            const typeStr = param.type && param.type !== 'any' ? `(${formatType(param.type)}) ` : '';
                            md += `- \`${param.name}\` ${typeStr}- ${param.desc || ' '}\n`.replace(/\s+- $/, '');
                        }
                        md += '\n';
                    }
                    
                    if (fn.returns) {
                        md += `**Returns:** ${formatType(fn.returns.type)}`;
                        if (fn.returns.desc) md += ` — ${fn.returns.desc}`;
                        md += '\n\n';
                    }
                    
                    if (fn.throws.length > 0) {
                        md += `**Throws:**\n\n`;
                        for (const t of fn.throws) {
                            md += `- \`${t.type}\`${t.desc ? `: ${t.desc}` : ''}\n`;
                        }
                        md += '\n';
                    }
                    
                    if (fn.see.length > 0) {
                        md += `**See:**\n\n`;
                        for (const s of fn.see) {
                            md += `- ${s}\n`;
                        }
                        md += '\n';
                    }
                    
                    if (fn.examples.length > 0) {
                        md += `**Examples:**\n\n`;
                        for (const ex of fn.examples) {
                            md += '```typescript\n' + ex + '\n```\n\n';
                        }
                    }
                    
                    const crossRef = generateCrossReference(fn.name, allItemsGlobal);
                    if (crossRef) md += `\n${crossRef}\n\n`;
                }
            }
            
            await fs.writeFile(path.join(apiDocsDir, `${fileName}.md`), md);
            
            const sidebarItem = { text: displayName, link: `/api/${fileName}` };
            indexContent += `- [${displayName}](/api/${fileName})\n`;
            
            if (groups[dirName]) {
                groups[dirName].items.push(sidebarItem);
            } else {
                groups['core'].items.push(sidebarItem);
            }
        }
    }

    for (const [key, group] of Object.entries(groups)) {
        group.items.sort((a, b) => a.text.localeCompare(b.text));
        
        if (group.items.length > 0) {
            apiSidebar.push({
                text: group.text,
                items: group.items,
                collapsed: true
            });
        }
    }

    await fs.writeFile(path.join(apiDocsDir, 'index.md'), indexContent);

    console.log(`✅ Generated API docs for ${Object.values(groups).reduce((sum, g) => sum + g.items.length, 0)} modules`);
    return { apiSidebar: [{ text: 'API Reference', items: apiSidebar, link: '/api/' }] };
}

async function updateVitepressConfig(sidebar) {
    const configPath = path.join(DOCS_SRC_DIR, '.vitepress', 'config.js');
    const configContent = `
export default {
  title: 'DiscordLLMBot',
  description: "A lightweight, persona-driven Discord bot using Google's Gemini API.",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API Reference', link: '/api/' }
    ],
    sidebar: ${JSON.stringify(sidebar, null, 2).replace(/"(\w+)":/g, '$1:')},
    search: {
      provider: 'local'
    }
  }
}`;
    await fs.writeFile(configPath, configContent);
}

async function main() {
    try {
        const packageJsonPath = path.resolve(PROJECT_ROOT, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const repoUrl = packageJson.repository?.url;
        
        console.log('📄 Generating README pages...');
        const guideSidebar = await generateReadmePages(repoUrl);
        
        console.log('📚 Generating API documentation...');
        const { apiSidebar } = await generateApiDocs(repoUrl);
        
        const sidebar = [guideSidebar, ...apiSidebar];
        
        await updateVitepressConfig(sidebar);
        console.log('✅ Documentation generated successfully.');
    } catch (error) {
        console.error('❌ Error generating documentation:', error);
    }
}

main();
