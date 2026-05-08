<?php

namespace App\Enums;

enum FamilyEnrollmentStatus: string
{
    case Draft = 'draft';
    case PendingBoard = 'pending_board';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
