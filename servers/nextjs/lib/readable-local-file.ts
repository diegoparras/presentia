import fs from "fs";
import os from "os";
import path from "path";

export class LocalFileAccessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 403 | 404,
  ) {
    super(message);
    this.name = "LocalFileAccessError";
  }
}

function isWithinBaseDir(candidatePath: string, baseDir: string): boolean {
  const relativePath = path.relative(baseDir, candidatePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function resolveBaseDir(baseDir: string): string {
  const resolvedBaseDir = path.resolve(baseDir);
  return fs.existsSync(resolvedBaseDir)
    ? fs.realpathSync(resolvedBaseDir)
    : resolvedBaseDir;
}

function allowedReadableFileBaseDirs(): string[] {
  const appDataDirectory =
    process.env.APP_DATA_DIRECTORY?.trim() || "/app/user_data";
  const tempDirectory =
    process.env.TEMP_DIRECTORY?.trim() || path.join(os.tmpdir(), "presenton");

  return [appDataDirectory, tempDirectory].map(resolveBaseDir);
}

export function resolveReadableLocalFile(filePath: unknown): string {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new LocalFileAccessError("Invalid file path", 400);
  }

  const requestedPath = path.resolve(filePath);
  if (!fs.existsSync(requestedPath)) {
    throw new LocalFileAccessError("File not found", 404);
  }

  const resolvedPath = fs.realpathSync(requestedPath);
  const isPathAllowed = allowedReadableFileBaseDirs().some((baseDir) =>
    isWithinBaseDir(resolvedPath, baseDir),
  );

  if (!isPathAllowed) {
    throw new LocalFileAccessError("Access denied: File path not allowed", 403);
  }

  return resolvedPath;
}
