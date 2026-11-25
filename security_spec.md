# Security Specification — wamunigga.com

## Data Invariants
1. Every document ID in single-document reads/writes (`bookingId`, `lockId`, `cardId`, `subId`, `code`, `orderId`, `inquiryId`) must match `^[a-zA-Z0-9_-]+$` and be <= 128 characters.
2. Bookings containing customer phone numbers (`bookings`), merch orders (`orders`), VIP subscriptions (`subscriptions`), and brand inquiries (`brand_inquiries`) cannot be listed or read by unauthenticated guests or non-admin users (zero PII leakage).
3. Slot availability (`slot_locks`) contains zero PII and requires an atomic `existsAfter` reference to a valid `bookings` document (unless written by an admin).
4. Guest loyalty card self-enrollment (`loyalty_cards`) can only initialize `stamps == 0` and `totalCuts == 0` with `tier == 'Standard'`; only verified admins can increment stamps or list all CRM records.
5. Admin access (`isAdmin()`) requires `request.auth != null && request.auth.token.email_verified == true` and either an explicit `/admins/{uid}` record or the verified owner email (`generaskagiraneza9@gmail.com`).
6. All timestamps (`createdAt`, `updatedAt`) on writes must equal `request.time`.

## Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on Booking**: Sending `{ ...validBooking, isAdmin: true }` -> Rejected by `keys().hasOnly(...)`.
2. **Double-Booking Slot Hijack**: Creating a `slot_locks` entry without a corresponding `bookings` document -> Rejected by `existsAfter(...)`.
3. **PII Listing Scrape**: Calling `getDocs(collection(db, 'bookings'))` as guest or non-admin -> Rejected by `allow list: if isAdmin()`.
4. **Loyalty Stamp Tampering**: Guest creating or updating `loyalty_cards/250788000001` with `stamps: 6` -> Rejected because create enforces `stamps == 0` and update requires `isAdmin()`.
5. **Unverified Email Admin Spoof**: Authenticated user with `email: 'generaskagiraneza9@gmail.com'` and `email_verified: false` -> Rejected by `email_verified == true`.
6. **Oversized String DoS**: Sending a 50KB `notes` or `brief` string -> Rejected by `.size() <= 300` / `.size() <= 1000`.
7. **Invalid Path ID Poisoning**: Creating `/bookings/invalid$id..` -> Rejected by `isValidId()`.
8. **Negative Financial Manipulation**: Creating an order with `totalRwf: -5000` -> Rejected by `totalRwf >= 0`.
9. **Client-Forged Timestamp**: Sending `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()` -> Rejected by `incoming().createdAt == request.time`.
10. **Status Shortcut on Booking**: Guest creating a booking with `status: 'completed'` -> Rejected because guest create requires `status in ['pending', 'confirmed']`.
11. **Self-Assigned Admin Escalation**: Authenticated non-admin writing to `/admins/{uid}` -> Rejected by `allow write: if false`.
12. **Referral Discount Spoofing**: Creating a referral with `discountRwf: 50000` -> Rejected because `discountRwf == 2000`.
