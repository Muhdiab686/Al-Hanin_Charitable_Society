<?php

namespace App\Enums;

enum AppointmentWorkflowStatus: string
{
    case PendingApproval = 'pending_approval';
    case RescheduleProposed = 'reschedule_proposed';
    case Scheduled = 'scheduled';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
}
