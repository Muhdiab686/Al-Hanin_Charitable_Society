<?php

namespace App\Enums;

enum InventoryItemStatus: string
{
    case Stored = 'stored';
    case Distributed = 'distributed';
    case Disposed = 'disposed';
}
