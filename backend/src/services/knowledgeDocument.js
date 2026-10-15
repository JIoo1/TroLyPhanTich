/**
 * WF01's current parser accepts text files containing ```json fenced question
 * records. It does not extract PDF/DOCX/CSV. Add the project/document metadata
 * to each JSON record so the rows can be filtered by WF02's project_id query.
 */
export function prepareKnowledgeDocument(source, metadata) {
  const invalid = (message) => Object.assign(new Error(message), { status: 400 });
  const jsonFence = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/gi;
  const matches = [...source.matchAll(jsonFence)];
  if (!matches.length) {
    throw invalid(
      'WF01 chỉ đọc file TXT/MD có các khối ```json chứa question_id và question_text_vi.',
    );
  }

  let validCount = 0;
  const questionIds = new Set();
  const transformed = source.replace(jsonFence, (block, jsonText) => {
    let record;
    try {
      record = JSON.parse(jsonText);
    } catch {
      throw invalid('File có một khối ```json sai định dạng.');
    }
    if (!record.question_id) return block;
    if (typeof record.question_id !== 'string' || !record.question_id.trim()) {
      throw invalid('question_id phải là chuỗi không được để trống.');
    }
    if (questionIds.has(record.question_id)) {
      throw invalid(`question_id ${record.question_id} bị trùng trong tài liệu.`);
    }
    if (typeof record.question_text_vi !== 'string' || !record.question_text_vi.trim()) {
      throw invalid(`Mục ${record.question_id} thiếu question_text_vi mà WF01 cần để lưu content.`);
    }
    questionIds.add(record.question_id);
    record.project_id = metadata.projectId;
    record.document_id = metadata.documentId;
    record.document_name = metadata.documentName;
    record.embedding_text =
      record.embedding_text || record.question_text_vi || record.question_purpose;
    validCount += 1;
    return `\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\``;
  });

  if (!validCount) throw invalid('Không tìm thấy khối JSON hợp lệ có question_id trong file.');
  return { content: transformed, chunks: validCount };
}
