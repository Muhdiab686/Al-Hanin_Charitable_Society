<?php

namespace App\Enums;

enum HousingStatus: string
{
    case Owned = 'owned';
    case Rented = 'rented';
    case Hosted = 'hosted';
    case Unstable = 'unstable';
}
