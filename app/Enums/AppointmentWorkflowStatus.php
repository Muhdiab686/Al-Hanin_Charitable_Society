<?php

namespace App\Enums;

enum AppointmentWorkflowStatus: string
{
    case PendingApproval = 'pending_approval';
    case Scheduled = 'scheduled';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
}
