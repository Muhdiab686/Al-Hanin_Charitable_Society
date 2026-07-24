<?php

namespace App\Support;

final class AidRequestTypeGroups
{
    /** طلبات طبية — واجهة السكرتيرة */
    public const MEDICAL = [
        'surgery',
        'medical_prescription',
    ];

    /** دعم معيشي وعيني — واجهة أمين المستودع */
    public const LIVELIHOOD = [
        'urgent_financial',
        'special_item',
    ];

    public static function isMedical(string $type): bool
    {
        return in_array($type, self::MEDICAL, true);
    }

    public static function isLivelihood(string $type): bool
    {
        return in_array($type, self::LIVELIHOOD, true);
    }
}
