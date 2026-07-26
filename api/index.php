<?php

// إخفاء تحذيرات الـ Deprecated لكي لا تدمر مخرجات JSON
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

require __DIR__ . '/../public/index.php';