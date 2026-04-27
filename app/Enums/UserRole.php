<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Secretary = 'secretary';
    case Accountant = 'accountant';
    case Doctor = 'doctor';
    case Storekeeper = 'storekeeper';
    case Volunteer = 'volunteer';
    case Beneficiary = 'beneficiary';
    case Donor = 'donor';
}
