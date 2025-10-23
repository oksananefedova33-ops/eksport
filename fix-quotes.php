<?php
header('Content-Type: text/plain; charset=utf-8');

$db = dirname(dirname(__DIR__)) . '/data/zerro_blog.db';

try {
    $pdo = new PDO('sqlite:' . $db);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== ИСПРАВЛЕНИЕ КАВЫЧЕК В URL КНОПОК ===\n\n";
    
    // Получаем все страницы
    $stmt = $pdo->query("SELECT id, name, data_json FROM pages");
    $fixed = 0;
    
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $data = json_decode($row['data_json'], true);
        $changed = false;
        
        foreach($data['elements'] ?? [] as &$element) {
            if(strtolower($element['type'] ?? '') === 'linkbtn') {
                // Проверяем и чистим URL от кавычек
                if(isset($element['url'])) {
                    $oldUrl = $element['url'];
                    // Убираем одинарные и двойные кавычки с начала и конца
                    $newUrl = trim($oldUrl, "'\"");
                    
                    if($oldUrl !== $newUrl) {
                        echo "Страница '{$row['name']}' (ID: {$row['id']}):\n";
                        echo "  Было: {$oldUrl}\n";
                        echo "  Стало: {$newUrl}\n\n";
                        
                        $element['url'] = $newUrl;
                        $changed = true;
                        $fixed++;
                    }
                }
            }
        }
        
        // Если были изменения, сохраняем обратно в базу
        if($changed) {
            $updateStmt = $pdo->prepare("UPDATE pages SET data_json = ? WHERE id = ?");
            $updateStmt->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $row['id']]);
        }
    }
    
    echo "Исправлено URL: {$fixed}\n";
    echo "\nГотово! Теперь модуль замены ссылок должен работать.\n";
    
} catch(Exception $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
}