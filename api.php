<?php
declare(strict_types=1);
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

$action = $_POST['action'] ?? '';

if ($action === 'search') {
    $url = trim($_POST['url'] ?? '');
    
    if(empty($url)) {
        echo json_encode(['ok' => false, 'error' => 'URL не указан']);
        exit;
    }
    
    // Генерируем варианты URL
    $urlVariants = generateUrlVariants($url);
    
    $stmt = $pdo->query("SELECT id, name, data_json FROM pages");
    $totalCount = 0;
    $pageCount = 0;
    $details = [];
    $foundUrls = [];
    
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $data = json_decode($row['data_json'], true);
        $count = 0;
        
        // 1. Поиск в структурированных данных
        foreach($data['elements'] ?? [] as $element) {
            if(strtolower($element['type'] ?? '') === 'linkbtn') {
                $elementUrl = $element['url'] ?? '';
                
                foreach($urlVariants as $variant) {
                    if($elementUrl === $variant || 
                       stripos($elementUrl, $variant) !== false ||
                       stripos($variant, $elementUrl) !== false) {
                        $count++;
                        $foundUrls[] = $elementUrl;
                        break;
                    }
                }
            }
            
            // 2. Поиск в HTML-контенте (НОВОЕ!)
            if(!empty($element['html'])) {
                $htmlButtons = HtmlButtonParser::extractLinkButtons($element['html']);
                
                foreach($htmlButtons as $btn) {
                    foreach($urlVariants as $variant) {
                        if($btn['url'] === $variant || 
                           stripos($btn['url'], $variant) !== false ||
                           stripos($variant, $btn['url']) !== false) {
                            $count++;
                            $foundUrls[] = $btn['url'];
                            break;
                        }
                    }
                }
            }
        }
        
        if($count > 0) {
            $totalCount += $count;
            $pageCount++;
            $details[] = [
                'page_id' => $row['id'],
                'page_name' => $row['name'],
                'count' => $count
            ];
        }
    }
    
    echo json_encode([
        'ok' => true,
        'count' => $totalCount,
        'pages' => $pageCount,
        'details' => $details,
        'searched_variants' => $urlVariants,
        'found_urls' => array_unique($foundUrls)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'replace') {
    $findUrl = trim($_POST['find'] ?? '');
    $replaceUrl = trim($_POST['replace'] ?? '');
    $currentPageId = (int)($_POST['current_page'] ?? 0);
    
    if(empty($findUrl) || empty($replaceUrl)) {
        echo json_encode(['ok' => false, 'error' => 'URL не указаны']);
        exit;
    }
    
    $urlVariants = generateUrlVariants($findUrl);
    $replaced = 0;
    $currentPageAffected = false;
    
    $pdo->beginTransaction();
    
    try {
        $stmt = $pdo->query("SELECT id, data_json FROM pages");
        
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $data = json_decode($row['data_json'], true);
            $changed = false;
            
            // 1. Замена в структурированных данных
            for($i = 0; $i < count($data['elements'] ?? []); $i++) {
                if(strtolower($data['elements'][$i]['type'] ?? '') === 'linkbtn') {
                    foreach($urlVariants as $variant) {
                        if(($data['elements'][$i]['url'] ?? '') === $variant) {
                            $data['elements'][$i]['url'] = $replaceUrl;
                            $replaced++;
                            $changed = true;
                            
                            if($row['id'] == $currentPageId) {
                                $currentPageAffected = true;
                            }
                            break;
                        }
                    }
                }
                
                // 2. Замена в HTML-контенте (НОВОЕ!)
                if(!empty($data['elements'][$i]['html'])) {
                    list($newHtml, $count) = HtmlButtonParser::replaceLinkUrls(
                        $data['elements'][$i]['html'],
                        $findUrl,
                        $replaceUrl
                    );
                    
                    if($count > 0) {
                        $data['elements'][$i]['html'] = $newHtml;
                        $replaced += $count;
                        $changed = true;
                        
                        if($row['id'] == $currentPageId) {
                            $currentPageAffected = true;
                        }
                    }
                }
            }
            
            if($changed) {
                $updateStmt = $pdo->prepare("UPDATE pages SET data_json = :json WHERE id = :id");
                $updateStmt->execute([
                    ':json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':id' => $row['id']
                ]);
            }
        }
        
        $pdo->commit();
        
        echo json_encode([
            'ok' => true,
            'replaced' => $replaced,
            'current_page_affected' => $currentPageAffected
        ], JSON_UNESCAPED_UNICODE);
    } catch(Exception $e) {
        $pdo->rollBack();
        echo json_encode(['ok' => false, 'error' => 'Ошибка замены: ' . $e->getMessage()]);
    }
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Неизвестное действие']);

function generateUrlVariants($url) {
    $variants = [$url];
    
    if(strpos($url, 'www.') !== false) {
        $variants[] = str_replace('www.', '', $url);
    } else if(strpos($url, '://') !== false) {
        $variants[] = str_replace('://', '://www.', $url);
    }
    
    foreach($variants as $variant) {
        if(substr($variant, -1) === '/') {
            $variants[] = substr($variant, 0, -1);
        } else {
            $variants[] = $variant . '/';
        }
    }
    
    return array_unique($variants);
}