<?php

namespace App\Enums;

enum DonationType: string
{
    case Cash = 'cash';
    case InKind = 'in_kind';
}
