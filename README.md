# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## CareQueue frontend fixes (November 2026)

This ZIP contains the updated React/Vite frontend and the latest source files supplied in the conversation. It intentionally excludes `node_modules`.

### Run the project

```bash
npm install
npm run dev
```

### Included updates

- Patient and admin routes are guarded by their respective browser-tab session keys.
- Patient registration stores a SHA-256 password digest in the browser prototype; patient login checks it.
- Show/Hide controls are available for Patient Login, Admin Login, Registration Password, and Confirm Password.
- Patient logout no longer removes an active queue token. The patient can log back in in the same browser tab and continue tracking the token.
- Patient token ownership is associated with the signed-in patient email to reduce accidental token reuse across accounts.
- Admin removal of the last waiting token marks its history record as `Left Queue`.
- Reducing the waiting-patient count from the admin queue settings marks removed token history records as `Left Queue`.
- Queue history index entries include queue-session identifiers to reduce collisions when token numbers are reused after a reset.
- Patient email changes migrate patient history and prescription storage keys, update the history index, and update consultation patient email references.
- Existing prescription, consultation history, dashboard, theme, notifications, and floating games source is retained.

### Important prototype limitations

- This is still a frontend-only prototype. Browser storage is not a secure authentication or authorization system. The SHA-256 digest is only a temporary improvement for the demo; production authentication must be implemented by the Spring Boot backend using server-side password hashing (for example BCrypt), sessions/JWT, and role checks.
- Admin login is still a temporary prototype gate that accepts any non-empty email and password. Do not use it for real hospital access.
- Patient profiles created before password verification was added do not contain a password digest, because the earlier version did not save passwords. Those legacy test profiles cannot be password-verified by this frontend update; create a fresh test profile with a different email or migrate accounts through the backend.
- Browser `localStorage` data is local to the browser and is not a replacement for a shared PostgreSQL database.

### Build / lint validation note

The source was checked with the available ESLint installation. The project still reports pre-existing React hook/style lint findings in several existing components. A production build could not be run in this environment because the uploaded `node_modules` is missing the platform-specific Rolldown native binding. Run `npm install` on your computer before testing; do not copy the old `node_modules` folder into another operating system.

## Real-time device notifications (Web Push)

This version includes a browser service worker, a patient-side **Enable device notifications** control, and a Spring Boot push backend in `backend/`. This is separate from the in-app notification bell: system notifications can appear while the website is in the background or closed.

Follow `backend/README.md` to create the PostgreSQL database, generate VAPID keys, start Spring Boot, enable notifications on each device, and send a test notification. Production requires HTTPS.

**Important:** queue data is still stored in browser localStorage. Cross-device automatic queue alerts become fully operational only after the queue and consultation actions are moved into the shared Spring Boot/PostgreSQL backend and invoke the push service after each state change. The included `/api/push/test` route is a delivery test, not the final production event integration. Secure the development test/send routes before deployment.
