<?php

namespace App\Enums;

enum BeneficiaryFollowUpStatus: string
{
    case UnderReview = 'under_review';
    case Active = 'active';
    case Suspended = 'suspended';
    case Ended = 'ended';
}
