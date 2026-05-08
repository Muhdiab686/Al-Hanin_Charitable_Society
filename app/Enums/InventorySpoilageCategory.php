<?php

namespace App\Enums;

enum InventorySpoilageCategory: string
{
    case Perishable = 'perishable';
    case NonPerishable = 'non_perishable';
}
