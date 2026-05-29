import { ipcMain } from "electron";
import fs from "fs";
import { resolveReadableLocalFile } from "../utils/readable-file-access";

export function setupReadFile() {
  ipcMain.handle("read-file", async (_, filePath: unknown) => {
    try {
      const resolvedPath = resolveReadableLocalFile(filePath);
      const content = fs.readFileSync(resolvedPath, "utf-8");
      return { content };
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });
}
