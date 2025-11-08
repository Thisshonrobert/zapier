
import { withAccelerate } from '@prisma/extension-accelerate'
import { PrismaClient } from '../../../apps/webhook/generated/prisma/client'
export const prisma = new PrismaClient().$extends(withAccelerate())