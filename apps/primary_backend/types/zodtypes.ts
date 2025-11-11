
import {  z } from "zod"

export const SignupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6),
  name: z.string().min(3),
});

export const SigninSchema = z.object({
  email: z.email("Invalid email Address"),
  password: z.string(),
});

export const ZapScehema = z.object({
  availableTriggerId: z.string(),
  triggerMetadata:z.any(),
  actions:z.array(z.object({
    availableActionId: z.string(),
    actionMetadata: z.any(),
  })),
})

