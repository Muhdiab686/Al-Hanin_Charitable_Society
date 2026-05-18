<?php

namespace App\Enums;

enum FamilyRelationship: string
{
    case Head = 'head';
    case Spouse = 'spouse';
    case Child = 'child';
    case Other = 'other';
}
