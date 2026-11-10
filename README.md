<div align="center">

# CareQueue

### Smart, real-time clinical queue management

A full-stack web application for managing department queues, tracking patient turns, and improving communication between patients and healthcare staff.

[![Live App](https://img.shields.io/badge/Live%20App-Visit%20CareQueue-0D9488?style=for-the-badge&logo=vercel&logoColor=white)](https://care-queue-phi.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/)
[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E699?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)

[Features](#features) · [Tech Stack](#technology-stack) · [Setup](#run-locally) · [Team](#team-members--contributions) · [Acknowledgements](#acknowledgements)

</div>

**Repository:** [github.com/soo6ya/CareQueue](https://github.com/soo6ya/CareQueue)

> **Project notice:** CareQueue is an academic/team project and demonstration application. It is not a certified medical record system and is not a substitute for clinical judgement. Do not use it to store real patient information without an appropriate privacy, security, and compliance review.

## Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Run Locally](#run-locally)
- [Deployment](#deployment)
- [Collaboration](#collaboration)
- [Security](#security)
- [Team Members & Contributions](#team-members--contributions)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Features

- Patient registration with email OTP verification and login.
- Role-based access for patients and administrators.
- Department-based queue management.
- Patient queue joining, leaving, and rejoining.
- Live queue status and patient dashboard synchronization.
- Admin dashboard for managing queues and calling the next patient.
- Consultation history with patient details.
- Push notifications for doctor calls and estimated-wait reminders.
- Responsive interface for desktop and mobile.
- Light and dark theme support.
- Floating mini-games interface.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | [![React](https://img.shields.io/badge/React-2026-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/) JavaScript, CSS |
| Backend | [![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://www.java.com/) [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot) [![Maven](https://img.shields.io/badge/Maven-Build-C71A36?style=flat-square&logo=apachemaven&logoColor=white)](https://maven.apache.org/) |
| Database | [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/) [Neon](https://neon.tech/) |
| Authentication | JWT |
| Email | [Brevo transactional email API](https://www.brevo.com/) |
| Push notifications | Web Push, VAPID |
| Frontend hosting | [Vercel](https://vercel.com/) |
| Backend hosting | [Render](https://render.com/) |

## Architecture

```text
Patient / Admin browser
          |
          v
 React + Vite frontend
          |
          | HTTP API requests
          v
 Spring Boot REST backend
       |          |
       v          v
 PostgreSQL    Email / Push
   (Neon)      (Brevo / Web Push)
```

The production frontend is hosted on Vercel and communicates with the Spring Boot API hosted on Render. PostgreSQL is hosted on Neon.

## Repository structure

The main application folders are:

```text
CareQueue/
├── backend/                  # Spring Boot backend
│   ├── src/
│   │   └── main/
│   │       ├── java/         # Controllers, services, entities, repositories
│   │       └── resources/    # Application configuration
│   └── pom.xml
├── src/                      # React frontend source
│   ├── components/
│   ├── pages/
│   └── ...
├── public/                   # Static frontend assets
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

Some files or folders may vary as the project evolves.

## Prerequisites

Install the following before running the project locally:

- Node.js and npm
- Java 17 or a compatible JDK
- Maven (or use the Maven wrapper if one is added to the repository)
- Access to a PostgreSQL database
- Environment credentials for the email and push-notification services if you want to test those features

## Run locally

### 1. Clone the repository

```bash
git clone https://github.com/soo6ya/CareQueue.git
cd CareQueue
```

### 2. Configure the backend

Create or configure the backend environment variables in the terminal used to start Spring Boot. Do not commit real credentials to Git.

The backend configuration uses these environment-variable names:

| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRATION` | JWT expiration configuration |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `EMAIL_PROVIDER` | Email provider selection (for example, `brevo`) |
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified sender email address |
| `BREVO_SENDER_NAME` | Sender display name |
| `VAPID_PUBLIC_KEY` | Web Push public key |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `VAPID_SUBJECT` | Web Push contact subject |
| `REFRESH_COOKIE_SECURE` | Secure-cookie setting |
| `ADMIN_EMAIL` | Initial administrator email, if configured |
| `ADMIN_PASSWORD` | Initial administrator password, if configured |
| `ADMIN_NAME` | Initial administrator display name, if configured |

Use values from your own development environment. Never publish API keys, passwords, JWT secrets, database URLs containing credentials, private VAPID keys, or production environment files.

From the backend directory, start the API:

```bash
cd backend
mvn spring-boot:run
```

The backend normally starts on `http://localhost:8080`, unless its port configuration has been changed.

### 3. Configure and run the frontend

Open a second terminal at the repository root:

```bash
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`. The project's Vite configuration proxies `/api` requests to the local backend; keep that proxy configuration aligned with the backend address.

### 4. Create a production frontend build

From the repository root:

```bash
npm run build
```

The generated production assets are written to `dist/`.

### 5. Build the backend

From the `backend/` directory:

```bash
mvn clean package
```

The executable JAR is generated under `backend/target/`.

## Deployment

The current production deployment is:

- **Frontend:** Vercel — https://care-queue-phi.vercel.app/
- **Backend:** Render — https://carequeue-backend-masy.onrender.com
- **Database:** Neon PostgreSQL

Deployment requires the appropriate environment variables to be configured in the hosting providers' dashboards. Do not put production secrets in source code or this README.

The backend may take some time to respond after an idle period if it is hosted on a service that sleeps when inactive.

## Collaboration

Contributions from teammates are welcome.

1. Ask the repository owner for collaborator access.
2. Clone the repository after access is granted.
3. Create a feature branch for your changes.
4. Make and test your changes locally.
5. Push the branch and open a pull request for review.

Suggested branch naming:

```text
feature/short-description
fix/short-description
docs/short-description
```

Please avoid committing secrets, personal data, generated build folders, or local environment files.

## Security

- Keep `.env` files and all credentials out of Git.
- Use strong, unique secrets for JWT signing and database access.
- Rotate any credential that may have been exposed.
- Do not use real patient data in development or public demonstrations.
- Report suspected vulnerabilities privately to the repository maintainers rather than publishing exploit details in an issue.

## Team Members & Contributions

The project was collaboratively developed by the following contributors:

| Contributor | GitHub Profile | Responsibilities |
|---|---|---|
| soo6ya | [@soo6ya](https://github.com/soo6ya) | Development, testing, and validation |
| Nihal9037 | [@Nihal9037](https://github.com/Nihal9037) | Development and research |
| sarang-sm | [@sarang-sm](https://github.com/sarang-sm) | Testing and validation |
| hemanthpattem03 | [@hemanthpattem03](https://github.com/hemanthpattem03) | Documentation and research |

## License
No license has been specified yet. Until a license is added to this repository, do not assume that the code is available for unrestricted reuse, modification, or redistribution.

## Acknowledgements

Built collaboratively as a project to explore digital queue management, patient-facing dashboards, and administrative queue workflows.

## Acknowledgements

We would like to thank the tools and platforms that supported the team's learning and development process.

### AI tools

<div align="center">

[<img src="https://img.shields.io/badge/ChatGPT-OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="ChatGPT by OpenAI" />](https://chatgpt.com/)
&nbsp;
[<img src="https://img.shields.io/badge/Claude-Anthropic-D97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude by Anthropic" />](https://claude.ai/)

</div>

Special thanks to **ChatGPT by OpenAI** and **Claude by Anthropic** for providing AI assistance during the project, including technical brainstorming, understanding concepts, debugging support, implementation guidance, and documentation refinement.

The project direction, integration decisions, code review, testing, and final validation remain the responsibility of the human project team. AI-generated suggestions were reviewed and adapted as part of the team's workflow.

### Platforms and technologies

Thanks to the open-source communities and services behind React, Vite, Java, Spring Boot, PostgreSQL, and the tools used to build, host, and operate CareQueue.
