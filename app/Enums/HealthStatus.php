<?php

namespace App\Enums;

enum HealthStatus: string
{
    case Healthy = 'healthy';
    case ChronicIllness = 'chronic_illness';
    case Disability = 'disability';
    case NeedsSpecialCare = 'needs_special_care';
}
