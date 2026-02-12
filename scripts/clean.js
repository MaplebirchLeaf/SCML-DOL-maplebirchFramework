const fs = require('fs-extra');
const path = require('path');

async function clean() {
  const distDir = path.resolve(__dirname, '../dist');
  const packageDir = path.resolve(__dirname, '../package');

  try {
    await fs.remove(distDir);
    console.log('✓ dist目录已清理');
    await fs.remove(packageDir);
    console.log('✓ package目录已清理');
  } catch (err) {
    console.error('清理目录时出错:', err);
    process.exit(1);
  }
}

clean();