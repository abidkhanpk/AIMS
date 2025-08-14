
# Learning Management System (LMS)

This is a full-featured, production-ready Learning Management System (LMS) built with Node.js, Express, PostgreSQL, and Prisma. The frontend is rendered using EJS and styled with Bootstrap 5.

## Features

- **User Roles:** Developer, Admin, Teacher, Parent, Student.
- **Multi-Academy:** Each academy has its own branding and users.
- **Progress Tracking:** Teachers can track student progress.
- **Secure Authentication:** Passwords are hashed with bcrypt, and sessions are used for authentication.
- **Role-Based Access Control:** Routes are protected based on user roles.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [PostgreSQL](https://www.postgresql.org/)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd lms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add the following:

```
# Application Configuration
PORT=3000
SESSION_SECRET="a_very_secret_key_that_should_be_changed"

# Database URL for Prisma
# Replace with your actual PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/lmsdb?schema=public"
```

**Note:** Make sure to replace the `DATABASE_URL` with your actual PostgreSQL connection string.

### 4. Run database migrations

This will create the necessary tables in your database.

```bash
npm run migrate
```

### 5. Seed the database

This will populate the database with sample data.

```bash
npm run seed
```

### 6. Run the application

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Sample Users

The seed script creates the following users. The password for all users is `password123`.

- **Developer:** `dev@lms.com`
- **Admin:** `admin@gta.com`
- **Teacher:** `teacher@gta.com`
- **Student:** `student@gta.com`
- **Parent:** `parent@gta.com`
