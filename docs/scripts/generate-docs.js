import fs from 'fs/promises';
import path from 'path';
import * as documentation from 'documentation';

const DOCS_SRC_DIR = path.resolve(process.cwd(), './docs/src');
const PROJECT_ROOT = path.resolve(process.cwd(), './docs');

async function generateReadmePages() {
  const readmePath = path.resolve(PROJECT_ROOT, '../README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf-8');
  const sections = readmeContent.split('---\n\n## ');
  const sidebar = [];

  // Create a hero index page
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
  // sidebar.push({ text: 'Home', link: '/' });

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    let title, fileName, content;

    if (i === 0) {
      title = 'Introduction';
      fileName = 'introduction.md';
      content = section;
    } else {
      const titleMatch = section.match(/^(.*)/);
      if (titleMatch) {
        const rawTitle = titleMatch[1].trim();
        // Remove content in parentheses for the filename and sidebar title
        title = rawTitle.replace(/\s*\(.*?\)\s*/g, '').trim();
        const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s/g, '-');
        fileName = sanitizedTitle + '.md';
        // Replace the first line (which is the title) with a top-level header
        content = `# ${section}`;
      }
    }

    if (title && fileName) {
      await fs.writeFile(path.join(DOCS_SRC_DIR, fileName), content);
      sidebar.push({ text: title, link: `/${fileName.replace('.md', '')}` });
    }
  }
  return sidebar;
}

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function generateApiDocs() {
  const srcDir = path.join('./bot/src');
  const apiDocsDir = path.join(DOCS_SRC_DIR, 'api');

  // Ensure the API docs directory exists
  await fs.mkdir(apiDocsDir, { recursive: true });

  const allFiles = await getFiles(srcDir);
  const apiSidebar = [];
  const apiNav = [];
  let indexContent = '# API Reference\n\nThis section contains the API documentation for the DiscordLLMBot source code.\n\n## Modules\n\n';

  for (const filePath of allFiles) {
    if (filePath.endsWith('.js')) {
      const relativePath = path.relative(srcDir, filePath);
      const fileName = relativePath.replace(/\\/g, '-').replace(/\//g, '-').replace('.js', '');

      try {
        const comments = await documentation.build([filePath], { shallow: true });
        if (comments.length > 0) {
          const output = await documentation.formats.md(comments);
          await fs.writeFile(path.join(apiDocsDir, `${fileName}.md`), output);
          apiSidebar.push({ text: relativePath, link: `/api/${fileName}` });
          indexContent += `- [${relativePath}](/api/${fileName})\n`;
        }
      } catch (error) {
        console.warn(`Could not generate docs for ${relativePath}: ${error.message}`);
      }
    }
  }

  // Write the API index file
  await fs.writeFile(path.join(apiDocsDir, 'index.md'), indexContent);

  if (apiSidebar.length > 0) {
    apiNav.push({ text: 'API Reference', link: '/api/' });
  }
  return { apiSidebar: [{ text: 'API Reference', items: apiSidebar, link: '/api/' }], apiNav };
}

async function updateVitepressConfig(sidebar, nav) {
  const configPath = path.join(DOCS_SRC_DIR, '.vitepress', 'config.js');
  const configContent = `
export default {
  title: 'DiscordLLMBot',
  description: "A lightweight, persona-driven Discord bot using Google's Gemini API.",
  themeConfig: {
    nav: ${JSON.stringify(nav, null, 2)},
    sidebar: ${JSON.stringify(sidebar, null, 2)}
  }
}`;
  await fs.writeFile(configPath, configContent);
}

async function main() {
  try {
    const readmeSidebar = await generateReadmePages();
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
