<?php

return array_replace_recursive(
    require base_path('vendor/livewire/livewire/config/livewire.php'),
    [
        'component_namespaces' => [
            'layouts' => resource_path('views/components/layouts'),
            'pages' => resource_path('views/pages'),
        ],
    ]
);
