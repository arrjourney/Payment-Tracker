# Security Specification - Payment Tracker

## Data Invariants
1. A loan must have an `ownerId` matching the authenticated user's UID.
2. A payment must belong to a loan that the user owns.
3. Amounts and interest rates must be non-negative.
4. `currentBalance` should be updated when a payment is added (enforced via logic and checked for consistency).

## The "Dirty Dozen" Payloads

1. **Identity Theft (Loan)**: Attempt to create a loan with an `ownerId` that doesn't match `request.auth.uid`.
2. **Unauthorized Read**: Attempt to read a loan document belonging to another user.
3. **Unauthorized Update**: Attempt to update another user's loan.
4. **Identity Spoofing (Update)**: Attempt to change the `ownerId` of a loan document.
5. **Unauthorized Payment Creation**: Attempt to add a payment to a loan owned by another user.
6. **Negative Principal**: Attempt to create a loan with a negative principal.
7. **Negative Payment**: Attempt to create a payment with a negative amount.
8. **Shadow Field Injection**: Attempt to create a loan with an extra field `admin: true`.
9. **PII Leak**: Attempt to read the `users` collection as another user.
10. **Orphaned Payment**: Attempt to create a payment for a loan that doesn't exist.
11. **Future Timestamp Manipulation**: Attempt to set `updatedAt` to a time in the far future (client-side timestamp vs server timestamp).
12. **Mass Querying**: Attempt to list all loans in the database without an `ownerId` filter.

## Test Runner (Logic Verification)
The patterns in `firestore.rules` will be tested in the following steps.
