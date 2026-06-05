# Security Specification: SmartScan Sovereign Cloud Storage

This document details the high-integrity security design and Attribute-Based Access Control (ABAC) invariants protecting our user receipts in Cloud Firestore.

## 1. Data Invariants

1. **Strict User Isolation**: A user (`userId`) can only read, write, update, or delete their own receipt sub-collection. No user can view or query another user's receipts collection under any circumstances.
2. **Strict Document Schema**: A scanned receipt must contain valid types (e.g., merchant must be a string <= 256 chars, items must be safe types, totals must be non-negative numbers).
3. **Immutability of Key Ownership**: Once a receipt is created under a user's collection, its owner is naturally immutable since Firestore paths lock it under `/users/{userId}/...`.
4. **Valid IDs Only**: All receipt IDs and child arrays must conform to safe length bounds to prevent resource-exhaustion attacks.

---

## 2. The "Dirty Dozen" Threat Payloads

Below are 12 specific payloads or access patterns designed to compromise system integrity, all of which will be rejected by our Firestore Security Rules (PERMISSION_DENIED):

1. **User Spoofing**: User A attempts to write a receipt into User B's subcollection (`/users/userB/receipts/receipt123`).
2. **Anonymous Admin Claim**: An unauthenticated user attempts to perform reads on a user receipts subcollection.
3. **Shadow Field Injection**: A client attempts to save an additional private or system field (e.g. `isVerifiedByAdmin: true` or `unauthorizedSync: true`) to bypass extraction filters.
4. **Huge Payload Denial of Wallet**: An attacker attempts to write a 1MB receipt document containing high-density junk characters or 10,000 array elements to trigger costly writes.
5. **Future Scanned Date Spoofing**: An attacker transmits a `scannedAt` value set 10 years in the future to corrupt analytical date-trends.
6. **Negative Price Corruption**: A payload where the `totalAmount` is negative (e.g. `-1500.00 EUR`), seeking to corrupt stats and balance calculations.
7. **Cross-Tenant List Scraping**: An attacker logs in as User A and tries to do a blanket collection query for all user receipts across the database without filtering by owner.
8. **Malicious ID Character Attack**: An attacker tries to write to a document ID with dangerous paths or SQL/JS-style commands (e.g., `../..` or `<script>`).
9. **No-Item Empty Structure**: Writing a receipt with missing items array structure or inconsistent count metadata.
10. **Client-Forced Server Timestamp**: Providing a pre-computed local timing value to misrepresent creation indices.
11. **Orphan Category Injection**: Creating a receipt with completely invalid categories hoping to crash categorization functions.
12. **Tampering with Historical Currency**: A malicious attempt to update or delete historic currency tags to spoof currency conversion processes.

---

## 3. The Rules Invariants & Layout

We will enforce these boundaries dynamically through standard rule helper functions (`isSignedIn()`, `isOwner()`, `isValidReceipt()`). Users are verified and shielded from unauthorized cross-reads.
