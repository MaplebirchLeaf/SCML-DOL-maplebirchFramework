// dts.config.js
module.exports = {
  entries: [
    {
      filePath: './src/main.ts',
      outFile: './dist/maplebirch.d.ts',
      libraries: {
        importedLibraries: false,
        inlineDeclareGlobals: false,
      },
      output: {
        noBanner: true,
        exportReferencedTypes: false,
        sort: true,
        respectPreserveConstEnum: true,
      },
    },
  ],
};