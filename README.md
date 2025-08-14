# LMS (Learning Management System)

A modular, scalable, and secure LMS for academies with multi-role support.

## Features

- Multi-academy branding
- Role-based dashboards (Developer, Admin, Teacher, Parent, Student)
- Progress tracking per student/subject
- Responsive UI (Bootstrap 5, jQuery)
- Secure authentication & authorization
- PostgreSQL with Prisma ORM

## Setup Instructions

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your values.

4. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   npm start
   ```

## Folder Structure

- `/backend` - Express.js API, Prisma, services, middleware
- `/frontend` - HTML5, Bootstrap 5, jQuery templates

## Environment Variables

See `.env.example` for required variables.

## Usage

- Access the app at `http://localhost:3000`
- Log in with sample credentials from the seed script (see `/backend/prisma/seed.js`)
- Each role sees their own dashboard and branding
- CRUD operations available for users, subjects, progress, and branding

## Prisma

- Schema: `/backend/prisma/schema.prisma`
- Migration: `npx prisma migrate dev`
- Seed: `npm run seed`

## Security

- Passwords hashed with bcrypt
- CSRF protection enabled
- Role-based access control middleware

## Notes

- For production, set secure values in `.env`
- Update branding assets in `/frontend/public/assets`
