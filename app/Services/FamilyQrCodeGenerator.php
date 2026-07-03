<?php

namespace App\Services;

use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Writer\SvgWriter;

final class FamilyQrCodeGenerator
{
    public function formatPayload(string $qrToken): string
    {
        return 'hanin:'.$qrToken;
    }

    /**
     * @return array{mime_type: string, base64: string}
     */
    public function toBase64Image(string $payload): array
    {
        $qrCode = new QrCode(
            data: $payload,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 280,
            margin: 10,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        );

        try {
            $png = (new PngWriter)->write($qrCode)->getString();

            return [
                'mime_type' => 'image/png',
                'base64' => base64_encode($png),
            ];
        } catch (\Throwable) {
            $svg = (new SvgWriter)->write($qrCode)->getString();

            return [
                'mime_type' => 'image/svg+xml',
                'base64' => base64_encode($svg),
            ];
        }
    }
}
