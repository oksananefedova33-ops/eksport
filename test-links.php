<?php
header('Content-Type: text/plain; charset=utf-8');

$db = dirname(dirname(__DIR__)) . '/data/zerro_blog.db';
$pdo = new PDO('sqlite:' . $db);

echo "=== АНАЛИЗ ССЫЛОК В БАЗЕ ===\n\n";

$stmt = $pdo->query("SELECT id, name, data_json FROM pages");
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $data = json_decode($row['data_json'], true);
    echo "Страница: {$row['name']} (ID: {$row['id']})\n";
    
    foreach($data['elements'] ?? [] as $element) {
        if(strtolower($element['type'] ?? '') === 'linkbtn') {
            echo "  - Кнопка: URL = '{$element['url']}'\n";
            echo "    Текст: {$element['text']}\n";
        }
    }
    echo "\n";
}