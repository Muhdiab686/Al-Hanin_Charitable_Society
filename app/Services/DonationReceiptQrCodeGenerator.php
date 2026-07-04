<?php

namespace App\Services;

use App\Models\Donation;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Writer\SvgWriter;

final class DonationReceiptQrCodeGenerator
{
    public function formatPayload(Donation $donation): string
    {
        return implode('|', [
            'hanin-donation',
            'id='.$donation->id,
            'receipt='.$donation->receipt_code,
            'amount='.$donation->cash_amount,
            'campaign='.($donation->campaign?->campaign_code ?? ''),
        ]);
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
