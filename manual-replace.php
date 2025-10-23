<?php
header('Content-Type: text/plain; charset=utf-8');

$db = dirname(dirname(__DIR__)) . '/data/zerro_blog.db';
$pdo = new PDO('sqlite:' . $db);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== РУЧНАЯ ЗАМЕНА URL ===\n\n";

// Получаем данные
$stmt = $pdo->query("SELECT id, name, data_json FROM pages WHERE id = 16");
$row = $stmt->fetch();

if(!$row) {
    echo "Страница с ID 16 не найдена!\n";
    exit;
}

$data = json_decode($row['data_json'], true);

echo "ДО ЗАМЕНЫ:\n";
$found = false;

// Используем индексы для прямого изменения
for($i = 0; $i < count($data['elements']); $i++) {
    if(strtolower($data['elements'][$i]['type'] ?? '') === 'linkbtn') {
        echo "URL: {$data['elements'][$i]['url']}\n";
        
        if($data['elements'][$i]['url'] === 'https://www.deepl.com/ru/translator') {
            // Прямое изменение по индексу
            $data['elements'][$i]['url'] = 'https://translate.google.com';
            echo "ЗАМЕНЯЕМ на: https://translate.google.com\n";
            $found = true;
        }
    }
}

if($found) {
    // Отладка - показываем что будем сохранять
    echo "\nJSON для сохранения:\n";
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
    
    // Сохраняем
    $newJson = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $updateStmt = $pdo->prepare("UPDATE pages SET data_json = :json WHERE id = :id");
    $result = $updateStmt->execute([':json' => $newJson, ':id' => 16]);
    
    echo "\nРезультат UPDATE: " . ($result ? "УСПЕХ" : "НЕУДАЧА") . "\n";
    echo "Затронуто строк: " . $updateStmt->rowCount() . "\n";
    
    // Проверяем результат
    $check = $pdo->query("SELECT data_json FROM pages WHERE id = 16")->fetch();
    $checkData = json_decode($check['data_json'], true);
    echo "\nПОСЛЕ ЗАМЕНЫ В БАЗЕ:\n";
    foreach($checkData['elements'] ?? [] as $el) {
        if(strtolower($el['type'] ?? '') === 'linkbtn') {
            echo "URL: {$el['url']}\n";
        }
    }
} else {
    echo "\nНичего не найдено для замены!\n";
}