# Hanin API - Postman Testing Guide

هذا الدليل يعطيك:
- ترتيب تشغيل السيناريوهات خطوة بخطوة
- مثال لكل API موجود
- طريقة سريعة لتجهيز Postman

## 1) التحضير

- شغّل السيرفر:
  - `php artisan serve`
- تأكد من تنفيذ المايغريشن:
  - `php artisan migrate`
- جهز مستخدمي أدوار مختلفة أو استعمل `/api/v1/auth/register`.
- استورد الملف:
  - `postman/Hanin_API.postman_collection.json`

داخل Postman:
- عدّل `base_url` (افتراضيًا `http://127.0.0.1:8000`)
- نفذ `Auth -> Login`
- التوكن ينحفظ تلقائيًا في متغير `token`.

---

## 2) السيناريو التسلسلي المقترح للتجربة

## السيناريو A - التأسيس

1. `Auth/Register`
2. `Auth/Login`
3. `Admin/Users - Store` لإنشاء مستخدمين أدوار (secretary, storekeeper, doctor, accountant, volunteer)
4. `Admin/Roles Catalog` للتحقق من الصلاحيات

## السيناريو B - الخدمات والمستفيدين

1. `Beneficiaries - Store`
2. `Family Enrollment Status` (approve)
3. `Family QR Code`
4. `QR Verify`
5. `Beneficiary - Recalculate Category`
6. `Family Aid Eligibility` (pause/resume)

## السيناريو C - المستودع والتبرعات

1. `Donation - Cash`
2. `Donation - In Kind`
3. `Inventory - List`
4. `Aid Requests - Store`
5. `Aid Request - Review`
6. `Aid Request - Inventory Distribution`
7. `Aid Request - Confirm Delivery`
8. `Inventory - Remove`

## السيناريو D - العيادات

1. `Clinic Staff - Upsert`
2. `Appointments - Store`
3. `Medical Records - Store`
4. `Doctor Payout Requests - Store`
5. `Doctor Payout Requests - Review`

## السيناريو E - المتطوعين

1. `Opportunities - Store`
2. `Opportunities - List`
3. `Opportunities - Register`
4. كرر التسجيل حتى الإغلاق التلقائي

## السيناريو F - المحاسبة

1. سجل تبرعات نقدية (manual/web)
2. `Finance Summary`
3. تحقق من `income`, `expenses`, `net`

---

## 3) مرجع API سريع (مثال لكل Endpoint)

## Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Admin
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/roles`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `GET /api/v1/admin/users/{user}`
- `PATCH /api/v1/admin/users/{user}`
- `DELETE /api/v1/admin/users/{user}`

## Beneficiaries & Families
- `GET /api/v1/beneficiaries`
- `POST /api/v1/beneficiaries`
- `PATCH /api/v1/beneficiaries/{beneficiary}`
- `POST /api/v1/beneficiaries/{beneficiary}/recalculate-category`
- `GET /api/v1/beneficiaries/{beneficiary}/medical-wallet`
- `POST /api/v1/beneficiaries/{beneficiary}/medical-wallet/credits`
- `PATCH /api/v1/families/{family}/enrollment-status`
- `PATCH /api/v1/families/{family}/aid-eligibility`
- `PATCH /api/v1/families/{family}`
- `GET /api/v1/families/{family}/qr-code`
- `POST /api/v1/qr/verify`

## Aid Requests
- `GET /api/v1/aid-requests`
- `POST /api/v1/aid-requests`
- `PATCH /api/v1/aid-requests/{aidRequest}/review`
- `POST /api/v1/aid-requests/{aidRequest}/inventory-distributions`
- `POST /api/v1/aid-requests/{aidRequest}/deliveries`

## Aid Distribution Plans
- `GET /api/v1/aid-distribution-plans`
- `POST /api/v1/aid-distribution-plans`

## Categories Rules
- `GET /api/v1/categories/rules`
- `PUT /api/v1/categories/{category}/rule`

## Donations & Inventory
- `GET /api/v1/donations`
- `POST /api/v1/donations` (cash / in_kind)
- `GET /api/v1/donations/{donation}`
- `GET /api/v1/inventory-items`
- `POST /api/v1/inventory-items/{inventoryItem}/remove`

## Clinic
- `GET /api/v1/clinic/staff`
- `PUT /api/v1/clinic/staff`
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `PATCH /api/v1/appointments/{appointment}/cancel`
- `GET /api/v1/medical-records`
- `POST /api/v1/medical-records`
- `GET /api/v1/doctor-payout-requests`
- `POST /api/v1/doctor-payout-requests`
- `PATCH /api/v1/doctor-payout-requests/{doctorPayoutRequest}/review`

## Volunteers
- `GET /api/v1/volunteer-opportunities`
- `POST /api/v1/volunteer-opportunities`
- `PATCH /api/v1/volunteer-opportunities/{volunteerOpportunity}`
- `DELETE /api/v1/volunteer-opportunities/{volunteerOpportunity}`
- `POST /api/v1/volunteer-opportunities/{volunteerOpportunity}/register`

## Finance
- `GET /api/v1/finance/summary`

---

## 4) أمثلة Payloads سريعة

## إنشاء تبرع نقدي
```json
{
  "type": "cash",
  "channel": "web",
  "cash_amount": 120.50,
  "donor_name": "Web Donor"
}
```

## إنشاء فرصة تطوعية
```json
{
  "title": "Aid delivery support",
  "description": "Support delivery day",
  "required_slots": 10,
  "starts_at": "2026-05-25 09:00:00"
}
```

## إنشاء موعد
```json
{
  "beneficiary_id": 1,
  "doctor_id": 5,
  "scheduled_at": "2026-05-22 10:00:00",
  "reason": "Routine check"
}
```

## إضافة رصيد وصفة طبية
```json
{
  "amount": 22.5,
  "prescription_reference": "RX-2026-0001",
  "notes": "Antibiotics"
}
```

---

## 5) ملاحظات عملية

- استعمل `token` مختلف حسب الدور عند اختبار الصلاحيات.
- endpoints التي تعتمد IDs تتطلب تحديث متغيرات Postman بعد كل إنشاء.
- إذا تغيّر الهيكل أو routes لاحقًا، حدّث collection مباشرة من نفس الملف.
