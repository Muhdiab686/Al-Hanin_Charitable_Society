<?php

namespace App\Enums;

enum MedicalSpecialty: string
{
    case General = 'طب عام';
    case Pediatrics = 'أطفال';
    case Gynecology = 'نسائية';
    case Orthopedics = 'عظام';
    case Cardiology = 'قلب';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
