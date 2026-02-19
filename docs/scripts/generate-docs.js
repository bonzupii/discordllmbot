import fs from 'fs/promises';
import path from 'path';

const DOCS_SRC_DIR = path.resolve(process.cwd(), './src');
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const BOT_SRC_DIR = path.resolve(PROJECT_ROOT, 'bot/src');

async function generateReadmePages() {
  const readmePath = path.resolve(PROJECT_ROOT, 'README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf-8');
  const sidebar = [];

  const packageJsonPath = path.resolve(PROJECT_ROOT, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  const repoUrl = packageJson.repository?.url;
  const heroContent = `---
layout: home

title: discordllmbot Documentation
titleTemplate: Modern Documentation System

hero:
  name: discordllmbot
  text: Documentation
  tagline: Comprehensive guides and references for the discordllmbot application
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/
    - theme: alt
      text: View Source
      link: ${repoUrl ? repoUrl.replace(/\.git$/, '') : '#'}

features:
  - title: Introduction
    details: Information about introduction
    link: /introduction/
  - title: API Reference
    details: Comprehensive API documentation
    link: /api/
---
`;
  await fs.writeFile(path.join(DOCS_SRC_DIR, 'index.md'), heroContent);

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
      sidebar.push({ text: title, link: `/${fileName.replace('.md', '')}` });
    }
  }
  return sidebar;
}

async function getFiles(dir, ext) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res, ext) : res;
  }));
  return Array.prototype.concat(...files).filter(f => f.endsWith(ext));
}

function extractJSDoc(content) {
  const functions = [];
  const classes = [];
  
  const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
  const jsdocPositions = [];
  let jsdocMatch;
  
  while ((jsdocMatch = jsdocRegex.exec(content)) !== null) {
    jsdocPositions.push({
      start: jsdocMatch.index,
      end: jsdocMatch.index + jsdocMatch[0].length,
      jsdoc: jsdocMatch[1]
    });
  }
  
  const funcRegexGlobal = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  let funcMatch;
  const funcMatches = [];
  
  while ((funcMatch = funcRegexGlobal.exec(content)) !== null) {
    funcMatches.push({
      name: funcMatch[1],
      start: funcMatch.index,
      end: funcMatch.index + funcMatch[0].length
    });
  }
  
  for (const func of funcMatches) {
    const jsdoc = jsdocPositions.find(j => j.end === func.start - 1 || (j.end < func.start && func.start - j.end < 20));
    
    let description = '';
    const paramsWithDesc = [];
    let returns = null;
    
    if (jsdoc) {
      const lines = jsdoc.jsdoc.split('\n');
      
      for (const line of lines) {
        const cleanLine = line.replace(/^\s*\*\s?/, '').trim();
        if (!cleanLine) continue;
        
        if (cleanLine.startsWith('@param')) {
          let paramMatch = cleanLine.match(/@param\s+\{([^}]+)\}\s+(\w+)\s*(-?\s*(.*))?/);
          if (!paramMatch) {
            paramMatch = cleanLine.match(/@param\s+(\w+)\s*-\s*(.*)/);
            if (paramMatch) {
              paramsWithDesc.push({ 
                name: paramMatch[1], 
                type: 'any',
                desc: paramMatch[2]?.trim() || '' 
              });
            }
          } else {
            paramsWithDesc.push({ 
              name: paramMatch[2], 
              type: paramMatch[1],
              desc: paramMatch[4]?.trim() || '' 
            });
          }
        } else if (cleanLine.startsWith('@returns') || cleanLine.startsWith('@return')) {
          const returnMatch = cleanLine.match(/@returns?\s+\{([^}]+)\}/);
          if (returnMatch) {
            returns = returnMatch[1];
          }
        } else if (!cleanLine.startsWith('@')) {
          description += (description ? '\n' : '') + cleanLine;
        }
      }
    }
    
    functions.push({ name: func.name, description: description.trim(), params: paramsWithDesc, returns });
  }
  
  const classRegexGlobal = /export\s+class\s+(\w+)/g;
  let classMatch;
  const classMatches = [];
  
  while ((classMatch = classRegexGlobal.exec(content)) !== null) {
    classMatches.push({
      name: classMatch[1],
      start: classMatch.index,
      end: classMatch.index + classMatch[0].length
    });
  }
  
  for (const cls of classMatches) {
    const jsdoc = jsdocPositions.find(j => j.end === cls.start - 1 || (j.end < cls.start && cls.start - j.end < 20));
    if (!jsdoc) continue;
    
    let description = '';
    const lines = jsdoc.jsdoc.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\*\s?/, '').trim();
      if (!cleanLine || cleanLine.startsWith('@')) continue;
      description += (description ? '\n' : '') + cleanLine;
    }
    
    classes.push({ name: cls.name, description: description.trim() });
  }
  
  return { functions, classes };
}

async function generateApiDocs() {
  const apiDocsDir = path.join(DOCS_SRC_DIR, 'api');
  await fs.mkdir(apiDocsDir, { recursive: true });

  const allFiles = await getFiles(BOT_SRC_DIR, '.ts');
  const apiSidebar = [];
  const apiNav = [];
  
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

  for (const filePath of allFiles) {
    const relativePath = path.relative(BOT_SRC_DIR, filePath).replace(/\\/g, '/');
    const fileName = relativePath.replace(/[/\\]/g, '-').replace('.ts', '');
    const dirName = relativePath.split('/')[0];
    const displayName = relativePath.replace('.ts', '');
    
    const content = await fs.readFile(filePath, 'utf-8');
    const { functions, classes } = extractJSDoc(content);
    
    if (functions.length > 0 || classes.length > 0) {
      let md = `# ${displayName}\n\n`;
      md += `**Source:** \`${relativePath}\`\n\n`;
      
      if (classes.length > 0) {
        md += `## Classes\n\n`;
        for (const cls of classes) {
          md += `### ${cls.name}\n\n`;
          if (cls.description) md += `${cls.description}\n\n`;
        }
      }
      
      if (functions.length > 0) {
        md += `## Functions\n\n`;
        for (const fn of functions) {
          md += `### ${fn.name}\n\n`;
          if (fn.description) md += `${fn.description}\n\n`;
          if (fn.params.length > 0) {
            md += `**Parameters:**\n\n`;
            for (const param of fn.params) {
              const typeStr = param.type && param.type !== 'any' ? `(\`${param.type}\`) ` : '';
              md += `- \`${param.name}\` ${typeStr}- ${param.desc || ' '}\n`.replace(/\s+- $/, '');
            }
            md += '\n';
          }
          if (fn.returns) {
            md += `**Returns:** \`${fn.returns}\`\n\n`;
          }
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
    if (group.items.length > 0) {
      apiSidebar.push({
        text: group.text,
        items: group.items,
        collapsed: true
      });
    }
  }

  await fs.writeFile(path.join(apiDocsDir, 'index.md'), indexContent);

  if (apiSidebar.length > 0) {
    apiNav.push({ text: 'API Reference', link: '/api/' });
  }
  
  console.log(`✅ Generated API docs for ${Object.values(groups).reduce((sum, g) => sum + g.items.length, 0)} modules`);
  return { apiSidebar: [{ text: 'API Reference', items: apiSidebar, link: '/api/' }], apiNav };
}

async function updateVitepressConfig(sidebar, nav) {
  const configPath = path.join(DOCS_SRC_DIR, '.vitepress', 'config.js');
  const configContent = `
export default {
  title: 'DiscordLLMBot',
  description: "A lightweight, persona-driven Discord bot using Google's Gemini API.",
  themeConfig: {
    nav: ${JSON.stringify(nav, null, 2).replace(/"(\w+)":/g, '$1:')},
    sidebar: ${JSON.stringify(sidebar, null, 2).replace(/"(\w+)":/g, '$1:')}
  }
}`;
  await fs.writeFile(configPath, configContent);
}

async function main() {
  try {
    console.log('📄 Generating README pages...');
    const readmeSidebar = await generateReadmePages();
    
    console.log('📚 Generating API documentation...');
    const { apiSidebar, apiNav } = await generateApiDocs();
    
    const sidebar = [...readmeSidebar, ...apiSidebar];
    const nav = [{ text: 'Home', link: '/' }, ...apiNav];
    
    await updateVitepressConfig(sidebar, nav);
    console.log('✅ Documentation generated successfully.');
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
  }
}

main();
