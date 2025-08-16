import { Role } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      adminId?: string | null
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: Role
    adminId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    adminId?: string | null
  }
}