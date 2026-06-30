<?php

namespace App\Enums;

enum EducationLevel: string
{
    case None = 'none';
    case Primary = 'primary';
    case Intermediate = 'intermediate';
    case Secondary = 'secondary';
    case University = 'university';
    case Vocational = 'vocational';
}
