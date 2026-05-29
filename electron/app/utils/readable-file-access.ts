import fs from "fs";
import path from "path";
import { getAppDataDir, getTempDir } from "./constants";

export class LocalFileAccessError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_PATH" | "NOT_FOUND" | "ACCESS_DENIED",
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
  return [getAppDataDir(), getTempDir()].map(resolveBaseDir);
}

export function resolveReadableLocalFile(filePath: unknown): string {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new LocalFileAccessError("Invalid file path", "INVALID_PATH");
  }

  const requestedPath = path.resolve(filePath);
  if (!fs.existsSync(requestedPath)) {
    throw new LocalFileAccessError("File not found", "NOT_FOUND");
  }

  const resolvedPath = fs.realpathSync(requestedPath);
  const isPathAllowed = allowedReadableFileBaseDirs().some((baseDir) =>
    isWithinBaseDir(resolvedPath, baseDir),
  );

  if (!isPathAllowed) {
    throw new LocalFileAccessError(
      "Access denied: File path not allowed",
      "ACCESS_DENIED",
    );
  }

  return resolvedPath;
}
