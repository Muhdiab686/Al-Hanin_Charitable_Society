<?php

namespace App\Enums;

enum WalletEntryCategory: string
{
    case DoctorPayout = 'doctor_payout';
    case PrescriptionCredit = 'prescription_credit';
    case CashAid = 'cash_aid';
    case MaterialAid = 'material_aid';
    case CashDonation = 'cash_donation';
}
