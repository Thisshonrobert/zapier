import { Router } from "express";
import {prisma} from "../../../packages/db/prisma/db"
import { SigninSchema, SignupSchema } from "../types/zodtypes";
import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";

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
      name: true,
      email: true,
    },
  });
  return res.json({
    userDetails,
  });
});


 

export const userRouter = router;