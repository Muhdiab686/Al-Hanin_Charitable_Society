<?php

namespace App\Enums;

enum InventoryRemovalReason: string
{
    case Expired = 'expired';
    case Damaged = 'damaged';
    case Lost = 'lost';
    case Other = 'other';
}
