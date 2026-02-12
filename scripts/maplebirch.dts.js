// scripts/maplebirch.dts.js

const fs = require('fs');
const { generateDtsBundle } = require('dts-bundle-generator');

if (!fs.existsSync('./dist')) fs.mkdirSync('./dist');

try {
  const [result] = generateDtsBundle([{
    filePath: './src/main.ts',
    output: {
      noBanner: true,
      sortNodes: true
    }
  }]);

  fs.writeFileSync('./dist/maplebirch.d.ts', result, 'utf8');
  console.log('✓ Type definitions generated successfully');
} catch (error) {
  console.error('✗ Failed to generate type definitions:', error.message);
  process.exit(1);
}