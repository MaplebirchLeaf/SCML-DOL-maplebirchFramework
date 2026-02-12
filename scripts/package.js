const path = require('path');
const fs = require('fs-extra');
const JSZip = require('jszip');

async function createModPackage() {
  const distDir = path.resolve(__dirname, '../dist');
  const packageDir = path.resolve(__dirname, '../package');

  await fs.ensureDir(packageDir);

  const zip = new JSZip();
  const bootTemplate = await fs.readJson(path.resolve(__dirname, '../boot.json'));

  const version = bootTemplate.version;

  const styleFiles = [];
  const additionFiles = [];

  async function addFilesToZip(currentPath) {
    const items = await fs.readdir(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        await addFilesToZip(itemPath);
      } else {
        const relativePath = path.relative(distDir, itemPath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const fileContent = await fs.readFile(itemPath);

        if (normalizedPath.endsWith('.css')) {
          styleFiles.push(normalizedPath);
        } else if (normalizedPath.endsWith('.yaml') || normalizedPath.endsWith('.json')) {
          additionFiles.push(normalizedPath);
        }

        zip.file(normalizedPath, fileContent);
      }
    }
  }

  await addFilesToZip(distDir);

  const modifiedBoot = {
    ...bootTemplate,
    scriptFileList_inject_early: ['inject_early.js'],
    styleFileList: styleFiles,
    additionFile: additionFiles
  };

  zip.file('boot.json', JSON.stringify(modifiedBoot, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const zipPath = path.join(packageDir, `SCML-maplebirchFrameworks-${version}.zip`);
  await fs.writeFile(zipPath, zipBuffer);

  console.log(`✓ 压缩包已生成: ${zipPath}`);
}

createModPackage().catch(console.error);