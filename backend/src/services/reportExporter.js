import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { createDocx } from './docxExporter.js';

const exporterDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../export-php');

/** Convert WF02 html/markdown to a persistent report file via the PHP CLI. */
export async function exportReport({ sessionId, format, html, markdown, messages = [] }) {
  if (!['pdf', 'docx'].includes(format)) throw new Error('Định dạng báo cáo không hợp lệ.');
  await fs.mkdir(config.reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '');
  const outputPath = path.join(config.reportDir, `${sessionId}_${timestamp}.${format}`);
  if (format === 'docx') {
    await fs.writeFile(outputPath, createDocx({ html, markdown, messages }));
    return { path: outputPath };
  }
  const script = path.join(exporterDir, 'export.php');
  const php = process.env.PHP_BINARY || 'php';

  await new Promise((resolve, reject) => {
    const child = spawn(php, ['-d', 'extension=gd', script, format, outputPath], {
      cwd: exporterDir,
      windowsHide: true,
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(stderr.trim() || `PHP export worker exited (${code})`)),
    );
    child.stdin.end(JSON.stringify({ html, markdown }));
  });
  return { path: outputPath };
}
