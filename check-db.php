<?php
header('Content-Type: text/plain; charset=utf-8');

$db = dirname(dirname(__DIR__)) . '/data/zerro_blog.db';

if(!file_exists($db)) {
    echo "База данных не найдена: $db\n";
    exit;
}

$pdo = new PDO('sqlite:' . $db);

echo "=== ПРЯМАЯ ПРОВЕРКА БАЗЫ ДАННЫХ ===\n\n";

$stmt = $pdo->query("SELECT id, name, data_json FROM pages WHERE data_json LIKE '%linkbtn%'");
$found = false;

while($row = $stmt->fetch()) {
    $found = true;
    echo "Страница: {$row['name']} (ID: {$row['id']})\n";
    
    $data = json_decode($row['data_json'], true);
    foreach($data['elements'] ?? [] as $el) {
        if(strtolower($el['type'] ?? '') === 'linkbtn') {
            echo "  - URL в базе: {$el['url']}\n";
            echo "  - Текст: {$el['text']}\n";
        }
    }
    echo "\n";
}

if(!$found) {
    echo "Кнопок-ссылок в базе не найдено\n";
}