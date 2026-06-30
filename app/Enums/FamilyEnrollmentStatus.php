<?php

namespace App\Enums;

enum FamilyEnrollmentStatus: string
{
    case Draft = 'draft';
    case UnderReview = 'under_review';
    case PendingBoard = 'pending_board';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
