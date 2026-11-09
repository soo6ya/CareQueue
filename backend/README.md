# CareQueue Web Push backend (Spring Boot)

This module adds browser/OS push notifications using a service worker, VAPID keys, and PostgreSQL-backed device subscriptions.

## Requirements
- Java 17+
- Maven 3.9+
- PostgreSQL
- HTTPS in production (localhost is allowed for local development)

Create the database:
```sql
CREATE DATABASE carequeue;
```

## Generate VAPID keys
Install Node.js and run:
```bash
npx web-push generate-vapid-keys
```
Set the generated keys as environment variables. Never commit the private key.
PowerShell:
```powershell
$env:VAPID_PUBLIC_KEY="PASTE_PUBLIC_KEY"
$env:VAPID_PRIVATE_KEY="PASTE_PRIVATE_KEY"
$env:DB_URL="jdbc:postgresql://localhost:5432/carequeue"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="YOUR_DB_PASSWORD"
$env:FRONTEND_ORIGIN="http://localhost:5173"
```

## Run backend
```bash
cd backend
mvn spring-boot:run
```
Run the React app in another terminal:
```bash
npm install
npm run dev
```

## Enable on a patient device
Log in as a patient, open the notification bell, choose **Enable device notifications**, and allow the browser permission prompt. Each browser/device must subscribe separately.

## Test delivery
```bash
curl -X POST "http://localhost:8080/api/push/test?email=patient@example.com"
```
A system notification should appear even when the CareQueue tab is in the background or closed, if the browser/OS permits background delivery.

## Trigger actual queue events
After the shared queue backend is implemented, call `POST /api/push/send?email=<patientEmail>` only after a queue/consultation transaction commits. Example:
```json
{"title":"You're next in the queue!","body":"Please stay ready. Your turn is approaching.","url":"/patient-dashboard","tag":"next-token-12"}
```
Use this for `It's your turn`, queue paused/resumed, and consultation completed.

## Important limitation and security
The existing React queue is still based on browser localStorage. That means the current frontend cannot detect an admin action performed on a different device. For fully automatic Domino's/WhatsApp-style alerts, queue and consultation updates must be moved into the shared Spring Boot/PostgreSQL backend and call the push service when state changes. This package adds the push delivery infrastructure and a test endpoint; it does not pretend the localStorage queue is already a cross-device backend.

The `/test` and `/send` endpoints are development endpoints. Protect `/send` and `/test` with authenticated admin authorization, and identify patients by authenticated user IDs rather than email query parameters before public deployment. Push permission is device/browser-specific and users can revoke it.
