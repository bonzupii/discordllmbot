import fs from 'fs/promises';
import path from 'path';
import * as documentation from 'documentation';

const DOCS_SRC_DIR = path.resolve(process.cwd(), 'src');
const PROJECT_ROOT = path.resolve(process.cwd(), '..');

async function generateReadmePages() {
  const readmePath = path.resolve(PROJECT_ROOT, 'README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf-8');
  const sections = readmeContent.split('---\n\n## ');

  for (const section of sections) {
    const titleMatch = section.match(/^(.*)/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const fileName = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s/g, '-') + '.md';
      const content = `## ${section}`;
      await fs.writeFile(path.join(DOCS_SRC_DIR, fileName), content);
    }
  }
}

async function generateApiDocs() {
  const files = await fs.readdir(path.join(PROJECT_ROOT, 'src'));
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(PROJECT_ROOT, 'src', file);
      const comments = await documentation.build([filePath], { shallow: true });
      const output = await documentation.formats.md(comments);
      const fileName = `api-${file.replace('.js', '.md')}`;
      await fs.writeFile(path.join(DOCS_SRC_DIR, fileName), output);
    }
  }
}

async function updateVitepressConfig() {
  const files = await fs.readdir(DOCS_SRC_DIR);
  const sidebar = files
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      text: path.basename(file, '.md'),
      link: `/${file.replace('.md', '')}`
    }));

  const configPath = path.join(DOCS_SRC_DIR, '.vitepress', 'config.js');
  const configContent = `export default {\n  title: \'DiscordLLMBot\',\n  description: \'A lightweight, persona-driven Discord bot using Google\\\'s Gemini API.\',\n  themeConfig: {\n    sidebar: ${JSON.stringify(sidebar, null, 2)}\n  }\n}`; 
  await fs.writeFile(configPath, configContent);
}

async function main() {
  try {
    await generateReadmePages();
    await generateApiDocs();
    await updateVitepressConfig();
    console.log('✅ Documentation generated successfully.');
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
  }
}

main();
