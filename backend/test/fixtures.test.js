import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { prepareKnowledgeDocument } from '../src/services/knowledgeDocument.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, '../../fixtures');
const read = (name) => JSON.parse(readFileSync(path.join(fixtures, name), 'utf8'));
const status = read('response-statuses.json');
const turn1 = read('chat_turn1.json');
const turn2 = read('chat_turn2.json');
const report = read('report.json');

test('successful chat fixtures contain the WF02 contract fields and expected types', () => {
  for (const [name, response] of [
    ['chat_turn1.json', turn1],
    ['chat_turn2.json', turn2],
  ]) {
    assert.equal(status[name], 200);
    for (const key of [
      'success',
      'persist',
      'response',
      'suggestions',
      'next_question',
      'new_requirements',
      'requirements_state',
      'completion',
      'ready_for_report',
    ]) {
      assert.ok(Object.hasOwn(response, key), `${name} is missing ${key}`);
    }
    assert.equal(response.success, true);
    assert.equal(response.persist, true);
    assert.equal(typeof response.response, 'string');
    assert.ok(Array.isArray(response.suggestions));
    assert.ok(Array.isArray(response.new_requirements));
    assert.equal(typeof response.requirements_state, 'object');
    assert.equal(typeof response.completion, 'number');
    assert.equal(typeof response.ready_for_report, 'boolean');
  }
});

test('turn 2 carries forward turn 1 requirements and adds unique requirement codes', () => {
  const previous = turn1.requirements_state.requirements.map((item) => item.requirement_code);
  const current = turn2.requirements_state.requirements.map((item) => item.requirement_code);
  assert.ok(previous.every((code) => current.includes(code)));
  assert.equal(
    new Set(current).size,
    current.length,
    'requirements_state contains duplicate codes',
  );
  const allNewCodes = [...turn1.new_requirements, ...turn2.new_requirements].map(
    (item) => item.requirement_code,
  );
  assert.equal(
    new Set(allNewCodes).size,
    allNewCodes.length,
    'requirement_code repeated across turns',
  );
});

test('report action returns successful HTML and Markdown', () => {
  assert.equal(status['report.json'], 200);
  assert.equal(report.success, true);
  assert.equal(report.action, 'report');
  assert.ok(report.html?.length > 0);
  assert.ok(report.markdown?.length > 0);
});

test('missing session_id produces the required 400 error', () => {
  const invalid = read('invalid_request.json');
  assert.equal(status['invalid_request.json'], 400);
  assert.equal(invalid.success, false);
  assert.equal(invalid.error, 'INVALID_REQUEST');
});

test('WF01 ingestion format is validated and scoped with project/document metadata', () => {
  const source = [
    '# Knowledge',
    '```json',
    '{"schema_version":"8.1.0"}',
    '```',
    '## Q-1',
    '```json',
    '{"question_id":"Q-1","question_text_vi":"CÃƒÂ¡ch Ã„â€˜Ã„Æ’ng kÃƒÂ½?","embedding_text":"HÃ†Â°Ã¡Â»â€ºng dÃ¡ÂºÂ«n Ã„â€˜Ã„Æ’ng kÃƒÂ½"}',
    '```',
  ].join('\n');
  const prepared = prepareKnowledgeDocument(source, {
    projectId: 'project-a',
    documentId: 'doc-1',
    documentName: 'knowledge.txt',
  });
  const chunk = [...prepared.content.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .find((record) => record.question_id);
  assert.equal(prepared.chunks, 1);
  assert.equal(chunk.project_id, 'project-a');
  assert.equal(chunk.document_id, 'doc-1');
  assert.equal(chunk.document_name, 'knowledge.txt');
  assert.equal(chunk.embedding_text, 'HÃ†Â°Ã¡Â»â€ºng dÃ¡ÂºÂ«n Ã„â€˜Ã„Æ’ng kÃƒÂ½');
  assert.match(prepared.content, /"schema_version":"8\.1\.0"/);
  assert.throws(
    () =>
      prepareKnowledgeDocument(
        source + '\n```json\n{"question_id":"Q-1","question_text_vi":"TrÃ¹ng"}\n```',
        { projectId: 'project-a', documentId: 'doc-1', documentName: 'knowledge.md' },
      ),
    /question_id Q-1/,
  );
  assert.throws(() => prepareKnowledgeDocument('plain text', {}), /question_id/);
});

test('captured report HTML exports to usable PDF and DOCX files', (t) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ba-export-fixture-'));
  const php = process.env.PHP_BINARY || 'php';
  const exporter = path.resolve(here, '../export-php/export.php');
  const input = JSON.stringify({ html: report.html, markdown: report.markdown });
  const outputs = ['pdf', 'docx'].map((format) => path.join(tempDir, `report.${format}`));
  t.after(() => {
    for (const file of outputs) {
      try {
        unlinkSync(file);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    for (const file of readdirSync(tempDir))
      assert.ok(!file, 'temporary export directory should be empty');
    rmdirSync(tempDir);
  });
  for (const [index, format] of ['pdf', 'docx'].entries()) {
    const result = spawnSync(php, ['-d', 'extension=gd', exporter, format, outputs[index]], {
      input,
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.ok(statSync(outputs[index]).size > 1000, `${format} output is unexpectedly small`);
  }
});
