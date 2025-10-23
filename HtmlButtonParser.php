<?php
/**
 * Универсальный парсер кнопок в HTML
 * Находит кнопки-ссылки и кнопки-файлы независимо от структуры DOM
 */
class HtmlButtonParser {
    
    /**
     * Извлекает все кнопки-ссылки из HTML
     * @param string $html HTML-контент
     * @return array Массив найденных кнопок
     */
    public static function extractLinkButtons($html) {
        if (empty($html)) return [];
        
        $buttons = [];
        
        // Подавляем ошибки парсинга HTML
        libxml_use_internal_errors(true);
        
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        
        $xpath = new DOMXPath($dom);
        
        // Ищем все <a> с классом bl-linkbtn или data-type="linkbtn"
        $queries = [
            "//a[contains(@class, 'bl-linkbtn')]",
            "//a[@data-type='linkbtn']",
            "//div[contains(@class, 'linkbtn')]//a",
            "//div[@data-type='linkbtn']//a"
        ];
        
        $foundNodes = [];
        foreach ($queries as $query) {
            $nodes = $xpath->query($query);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $foundNodes[] = $node;
                }
            }
        }
        
        // Удаляем дубликаты
        $foundNodes = array_unique($foundNodes, SORT_REGULAR);
        
        foreach ($foundNodes as $node) {
            $url = $node->getAttribute('href');
            $text = trim($node->textContent);
            
            // Пропускаем пустые и якорные ссылки
            if (empty($url) || $url === '#') continue;
            
            $buttons[] = [
                'type' => 'linkbtn',
                'url' => $url,
                'text' => $text,
                'target' => $node->getAttribute('target'),
                'class' => $node->getAttribute('class')
            ];
        }
        
        libxml_clear_errors();
        return $buttons;
    }
    
    /**
     * Извлекает все кнопки-файлы из HTML
     * @param string $html HTML-контент
     * @return array Массив найденных кнопок
     */
    public static function extractFileButtons($html) {
        if (empty($html)) return [];
        
        $buttons = [];
        
        libxml_use_internal_errors(true);
        
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        
        $xpath = new DOMXPath($dom);
        
        // Ищем все <a> с классом bf-filebtn или data-type="filebtn"
        $queries = [
            "//a[contains(@class, 'bf-filebtn')]",
            "//a[@data-type='filebtn']",
            "//div[contains(@class, 'filebtn')]//a",
            "//div[@data-type='filebtn']//a",
            "//a[@download]" // Любые ссылки с атрибутом download
        ];
        
        $foundNodes = [];
        foreach ($queries as $query) {
            $nodes = $xpath->query($query);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $foundNodes[] = $node;
                }
            }
        }
        
        // Удаляем дубликаты
        $foundNodes = array_unique($foundNodes, SORT_REGULAR);
        
        foreach ($foundNodes as $node) {
            $url = $node->getAttribute('href');
            $fileName = $node->getAttribute('download') ?: $node->getAttribute('data-file-name');
            $text = trim(strip_tags($node->textContent)); // Убираем иконки
            
            // Пропускаем пустые ссылки
            if (empty($url) || $url === '#') continue;
            
            // Если нет имени файла, берем из URL
            if (empty($fileName)) {
                $fileName = basename(parse_url($url, PHP_URL_PATH));
            }
            
            $buttons[] = [
                'type' => 'filebtn',
                'url' => $url,
                'fileName' => $fileName,
                'text' => $text,
                'class' => $node->getAttribute('class')
            ];
        }
        
        libxml_clear_errors();
        return $buttons;
    }
    
    /**
     * Заменяет URL в кнопках-ссылках
     * @param string $html HTML-контент
     * @param string $oldUrl Старый URL
     * @param string $newUrl Новый URL
     * @return array [html, replacedCount]
     */
    public static function replaceLinkUrls($html, $oldUrl, $newUrl) {
        if (empty($html)) return [$html, 0];
        
        $count = 0;
        libxml_use_internal_errors(true);
        
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        
        $xpath = new DOMXPath($dom);
        
        // Создаем варианты URL для поиска (с/без www, с/без trailing slash)
        $urlVariants = self::generateUrlVariants($oldUrl);
        
        // Ищем все ссылки
        $queries = [
            "//a[contains(@class, 'bl-linkbtn')]",
            "//a[@data-type='linkbtn']",
            "//div[contains(@class, 'linkbtn')]//a",
            "//div[@data-type='linkbtn']//a"
        ];
        
        foreach ($queries as $query) {
            $nodes = $xpath->query($query);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $currentUrl = $node->getAttribute('href');
                    
                    // Проверяем все варианты
                    foreach ($urlVariants as $variant) {
                        if ($currentUrl === $variant) {
                            $node->setAttribute('href', $newUrl);
                            $count++;
                            break;
                        }
                    }
                }
            }
        }
        
        // Сохраняем изменения
        $newHtml = '';
        if ($count > 0) {
            // Получаем только body content
            $body = $dom->getElementsByTagName('body')->item(0);
            if ($body) {
                foreach ($body->childNodes as $child) {
                    $newHtml .= $dom->saveHTML($child);
                }
            } else {
                $newHtml = $dom->saveHTML();
            }
            
            // Очищаем от служебных тегов
            $newHtml = preg_replace('/<\?xml[^>]*\?>/', '', $newHtml);
        } else {
            $newHtml = $html;
        }
        
        libxml_clear_errors();
        return [$newHtml, $count];
    }
    
    /**
     * Заменяет файлы в кнопках-файлах
     * @param string $html HTML-контент
     * @param string $oldUrl Старый URL файла
     * @param string $newUrl Новый URL файла
     * @param string $newFileName Новое имя файла
     * @return array [html, replacedCount]
     */
    public static function replaceFileUrls($html, $oldUrl, $newUrl, $newFileName) {
        if (empty($html)) return [$html, 0];
        
        $count = 0;
        libxml_use_internal_errors(true);
        
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        
        $xpath = new DOMXPath($dom);
        
        // Создаем варианты URL и имени файла
        $urlVariants = self::generateUrlVariants($oldUrl);
        $oldFileName = basename(parse_url($oldUrl, PHP_URL_PATH));
        
        // Ищем все кнопки-файлы
        $queries = [
            "//a[contains(@class, 'bf-filebtn')]",
            "//a[@data-type='filebtn']",
            "//div[contains(@class, 'filebtn')]//a",
            "//div[@data-type='filebtn']//a",
            "//a[@download]"
        ];
        
        foreach ($queries as $query) {
            $nodes = $xpath->query($query);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $currentUrl = $node->getAttribute('href');
                    $currentFileName = $node->getAttribute('download') ?: basename($currentUrl);
                    
                    // Проверяем совпадение по URL или имени файла
                    $matches = false;
                    foreach ($urlVariants as $variant) {
                        if ($currentUrl === $variant || $currentFileName === $oldFileName) {
                            $matches = true;
                            break;
                        }
                    }
                    
                    if ($matches) {
                        $node->setAttribute('href', $newUrl);
                        if ($newFileName) {
                            $node->setAttribute('download', $newFileName);
                            if ($node->hasAttribute('data-file-name')) {
                                $node->setAttribute('data-file-name', $newFileName);
                            }
                        }
                        $count++;
                    }
                }
            }
        }
        
        // Сохраняем изменения
        $newHtml = '';
        if ($count > 0) {
            $body = $dom->getElementsByTagName('body')->item(0);
            if ($body) {
                foreach ($body->childNodes as $child) {
                    $newHtml .= $dom->saveHTML($child);
                }
            } else {
                $newHtml = $dom->saveHTML();
            }
            
            $newHtml = preg_replace('/<\?xml[^>]*\?>/', '', $newHtml);
        } else {
            $newHtml = $html;
        }
        
        libxml_clear_errors();
        return [$newHtml, $count];
    }
    
    /**
     * Генерирует варианты URL (с/без www, с/без trailing slash)
     * @param string $url
     * @return array
     */
    private static function generateUrlVariants($url) {
        $variants = [$url];
        
        // Добавляем варианты с/без www
        if (strpos($url, 'www.') !== false) {
            $variants[] = str_replace('www.', '', $url);
        } else if (strpos($url, '://') !== false) {
            $variants[] = str_replace('://', '://www.', $url);
        }
        
        // Добавляем варианты с/без слэша в конце
        $temp = [];
        foreach ($variants as $variant) {
            $temp[] = $variant;
            if (substr($variant, -1) === '/') {
                $temp[] = substr($variant, 0, -1);
            } else {
                $temp[] = $variant . '/';
            }
        }
        
        return array_unique($temp);
    }
}