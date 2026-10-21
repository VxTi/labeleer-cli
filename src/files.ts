import fs from 'node:fs/promises';
import path from 'node:path';

export interface LabeleerFile {
  directoryPath: string;
  filename: string;
  absolutePath: AbsolutePath;
}

export function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '.');
}

export async function exists(path: string): Promise<boolean> {
  return fs.access(path, fs.constants.F_OK).then(() => true);
}

export function toLabeleerFile(filePath: AbsolutePath): LabeleerFile {
  const filename = path.basename(filePath);
  const directoryPath = path.dirname(filePath);
  return {
    directoryPath,
    filename,
    absolutePath: filePath,
  };
}

export type AbsolutePath = string & {};

export const cwd = process.cwd();
