import { Router } from "express";
import {prisma} from "../../../packages/db/prisma/db"
import { SigninSchema, SignupSchema } from "../types/zodtypes";
import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { authMiddleware } from "../middleware";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const JWT_SECRET = process.env.JWT_SECRET;
const router = Router();

router.post("/signup",async(req,res)=>{

const parsed = SignupSchema.safeParse(req.body)    

if(!parsed){
    return res.status(411).json({
      message: "Incorrect inputs.",
    });
}

const existing_user = await prisma.user.findFirst({
  where:{
    email:parsed.data?.email
  }
})

if(existing_user){
  return res.status(403).json({
    message:"User already exists."
  })
}


 const hashedPassword = await bcrypt.hash(parsed.data!.password, 10);
 const user = await prisma.user.create({
  data:{
    email:parsed.data!.email,
    name:parsed.data!.name,
    password:hashedPassword
  }
 })

  //TODO:await sendEmail();
  return res.json({
    message: "Please verify your account by checking your email.",
  });

});

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(411).json({
      message: "Incorrect Inputs",
    });
  }
  const user = await prisma.user.findFirst({
    where: {
      email: parsedData.data.email,
    },
  });
  if (!user) {
    return res.status(404).json({ message: "User not found.." });
  }

  // Google-only accounts have no password, so there is nothing to compare
  // against — refuse rather than letting bcrypt decide.
  if (!user.password) {
    return res.status(403).json({ message: "This account signs in with Google." });
  }

  const isPasswordValid = await bcrypt.compare(
    parsedData.data.password,
    user.password
  );
  if (!isPasswordValid) {
    return res.status(403).json({ message: "Invalid Credentials." });
  }

  const token = jwt.sign({
    id:user.id
  },JWT_SECRET!)
  return res.json({token:token});

})

router.get("/", authMiddleware, async (req, res) => {
 
  const id = req.id;
  const userDetails = await prisma.user.findFirst({
    where: {
      id,
    },
    select: {
      id:true,
      name: true,
      email: true,
    },
  });
  return res.json({
    userDetails,
  });
});


// router.get("/auth/me", authMiddleware, async (req, res) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: Number(req.id) },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//       },
//     });

//     return res.json({
//       authType: req.authType, // "jwt" or "clerk"
//       user,
//     });
//   } catch (e) {
//     return res.status(500).json({ message: "Error fetching user" });
//   }
// });
 

// Google (and any other Clerk social login) lands here: the browser proves
// identity to Clerk, we verify Clerk's token once, then hand back our OWN jwt.
// That keeps localStorage.token a single format, so every existing consumer
// (useZaps, ZapTable, authMiddleware) works unchanged for social logins.
router.post("/clerk", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No Clerk token provided" });
  }

  try {
    const verified = await verifyToken(authHeader.split(" ")[1]!, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const clerkUser = await clerk.users.getUser(verified.sub);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ message: "Clerk account has no email address" });
    }

    // Upsert, not create: the same person may already exist from a password signup.
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: clerkUser.firstName ?? email.split("@")[0]!,
      },
    });

    return res.json({ token: jwt.sign({ id: user.id }, JWT_SECRET!) });
  } catch (error) {
    console.error("clerk exchange failed", error);
    return res.status(401).json({ message: "Invalid Clerk token" });
  }
});


export const userRouter = router;