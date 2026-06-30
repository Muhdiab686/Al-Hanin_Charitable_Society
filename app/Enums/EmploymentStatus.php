<?php

namespace App\Enums;

enum EmploymentStatus: string
{
    case Employed = 'employed';
    case SelfEmployed = 'self_employed';
    case Unemployed = 'unemployed';
    case Retired = 'retired';
    case UnableToWork = 'unable_to_work';
    case Housewife = 'housewife';
}
