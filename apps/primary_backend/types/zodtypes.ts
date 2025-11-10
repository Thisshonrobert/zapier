
import {  z } from "zod"

export const SignupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6),
  name: z.string().min(3),
});

export const SigninSchema = z.object({
  email: z.string().email("Invalid email Address"),
  password: z.string(),
});

