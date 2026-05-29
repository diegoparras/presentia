import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  LocalFileAccessError,
  resolveReadableLocalFile,
} from '@/lib/readable-local-file';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    const resolvedPath = resolveReadableLocalFile(filePath);

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof LocalFileAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
