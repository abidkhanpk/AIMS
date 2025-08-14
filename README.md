
# LMS (Learning Management System)

This is a full-featured Learning Management System (LMS) built with Node.js, Express, PostgreSQL, and Prisma.

## Features

- User Roles: Developer, Admin, Teacher, Parent, Student
- Multi-Academy Branding
- Progress Tracking
- Secure Authentication & Authorization

## Prerequisites

- Node.js
- PostgreSQL

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up the database:**

   - Create a PostgreSQL database.
   - Copy the `.env.example` file to `.env` and update the `DATABASE_URL` with your database connection string.

4. **Run database migrations:**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed the database:**

   ```bash
   npm run seed
   ```

6. **Start the application:**

   ```bash
   npm start
   ```

## Available Scripts

- `npm start`: Starts the application.
- `npm run seed`: Seeds the database with initial data.
- `npx prisma migrate dev`: Runs database migrations.
- `npx prisma generate`: Generates the Prisma client.

## Default Login Credentials

- **Developer:**
  - Email: `developer@lms.com`
  - Password: `password123`
- **Admin:**
  - Email: `admin@lms.com`
  - Password: `password123`
- **Teacher:**
  - Email: `teacher@lms.com`
  - Password: `password123`
- **Student:**
  - Email: `student@lms.com`
  - Password: `password123`
- **Parent:**
  - Email: `parent@lms.com`
  - Password: `password123`
