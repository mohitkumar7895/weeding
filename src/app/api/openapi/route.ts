import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const file = path.join(process.cwd(), 'docs', 'openapi.json');
  const json = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : JSON.stringify({ openapi: '3.0.0', paths: {} });
  return new NextResponse(json, { headers: { 'Content-Type': 'application/json' } });
}
