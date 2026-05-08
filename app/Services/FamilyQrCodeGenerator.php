<?php

namespace App\Services;

use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;

final class FamilyQrCodeGenerator
{
    public function formatPayload(string $qrToken): string
    {
        return 'hanin:'.$qrToken;
    }

    public function toBase64Png(string $payload): string
    {
        $writer = new PngWriter;
        $qrCode = new QrCode(
            data: $payload,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 280,
            margin: 10,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        );

        return base64_encode($writer->write($qrCode)->getString());
    }
}
