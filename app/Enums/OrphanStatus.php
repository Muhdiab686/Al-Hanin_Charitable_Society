<?php

namespace App\Enums;

enum OrphanStatus: string
{
    case No = 'no';
    case Father = 'father';
    case Mother = 'mother';
    case Both = 'both';
}
