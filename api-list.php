<?php
header('Content-Type: application/json; charset=utf-8');

// Подключаем универсальный парсер
require_once dirname(__DIR__) . '/common/HtmlButtonParser.php';

$db = dirname(dirname(__DIR__)) . '/data/zerro_blog.db';

if(!file_exists($db)) {
    echo json_encode(['ok' => false, 'error' => 'База данных не найдена']);
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $db);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(Throwable $e) {
    echo json_encode(['ok' => false, 'error' => 'Ошибка подключения к БД']);
    exit;
}

// Получаем все уникальные ссылки
$stmt = $pdo->query("SELECT id, name, data_json FROM pages");
$allLinks = [];

while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $data = json_decode($row['data_json'], true);
    
    // 1. Поиск в структурированных данных
    foreach($data['elements'] ?? [] as $element) {
        if(strtolower($element['type'] ?? '') === 'linkbtn') {
            $url = $element['url'] ?? '';
            
            if($url && $url !== '#') {
                if(!isset($allLinks[$url])) {
                    $allLinks[$url] = [
                        'url' => $url,
                        'pages' => []
                    ];
                }
                if(!in_array($row['name'], $allLinks[$url]['pages'])) {
                    $allLinks[$url]['pages'][] = $row['name'];
                }
            }
        }
        
        // 2. Поиск в HTML-контенте элементов (НОВОЕ!)
        if(!empty($element['html'])) {
            $htmlButtons = HtmlButtonParser::extractLinkButtons($element['html']);
            
            foreach($htmlButtons as $btn) {
                $url = $btn['url'];
                
                if($url && $url !== '#') {
                    if(!isset($allLinks[$url])) {
                        $allLinks[$url] = [
                            'url' => $url,
                            'pages' => []
                        ];
                    }
                    if(!in_array($row['name'], $allLinks[$url]['pages'])) {
                        $allLinks[$url]['pages'][] = $row['name'];
                    }
                }
            }
        }
    }
}

echo json_encode([
    'ok' => true,
    'links' => array_values($allLinks)
], JSON_UNESCAPED_UNICODE);