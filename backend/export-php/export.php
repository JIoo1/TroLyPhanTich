<?php
declare(strict_types=1);

// CLI-only worker. Input report content is read from stdin; only server-generated
// format and output path arrive as arguments from the Express process.
require __DIR__ . '/vendor/autoload.php';
$format = $argv[1] ?? '';
$outputPath = $argv[2] ?? '';
$payload = json_decode((string) file_get_contents('php://stdin'), true, 512, JSON_THROW_ON_ERROR);
$html = (string) ($payload['html'] ?? '');
$markdown = (string) ($payload['markdown'] ?? '');
if (!in_array($format, ['pdf', 'docx'], true) || $outputPath === '') {
    fwrite(STDERR, 'Invalid export arguments');
    exit(2);
}
if ($html === '' && $markdown !== '') {
    $safe = htmlspecialchars($markdown, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $html = '<html><body><pre>' . $safe . '</pre></body></html>';
}
if ($html === '') {
    fwrite(STDERR, 'Report response contained no html or markdown');
    exit(3);
}

if ($format === 'pdf') {
    $mpdf = new \Mpdf\Mpdf([
        'mode' => 'utf-8',
        'format' => 'A4',
        'default_font' => 'dejavusans',
        'tempDir' => sys_get_temp_dir(),
    ]);
    $mpdf->WriteHTML('<style>table,td,th{border:1px solid #333;border-collapse:collapse}td,th{padding:5px}</style>' . $html);
    $mpdf->Output($outputPath, \Mpdf\Output\Destination::FILE);
    exit(0);
}

preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches);
$body = $matches[1] ?? $html;
$phpWord = new \PhpOffice\PhpWord\PhpWord();
$phpWord->setDefaultFontName('Times New Roman');
$section = $phpWord->addSection();
\PhpOffice\PhpWord\Shared\Html::addHtml($section, $body, false, false);
\PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007')->save($outputPath);
