import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createZip, resolvePackageInfo, verifyZip } from './zip';

export async function verifyPackage(rootDir: string): Promise<void> {
  const { baseName } = await resolvePackageInfo(rootDir);
  const filePath = path.join(rootDir, 'package', `${baseName}.mod.zip`);
  const actual = await readFile(filePath);
  await verifyZip(rootDir, actual);
  if (!actual.equals(await createZip(rootDir))) throw new Error(`ZIP is not reproducible from current sources: ${filePath}`);
  console.log(`Verified ZIP: ${filePath}`);
}

if (import.meta.main) {
  verifyPackage(path.join(import.meta.dir, '..')).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
