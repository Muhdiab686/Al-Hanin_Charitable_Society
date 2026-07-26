<?php

// إجبار السيرفر على عرض جميع الأخطاء القاتلة
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
putenv('APP_DEBUG=true');

require __DIR__ . '/../public/index.php';