// import {type NextFunction, type Request, type Response } from "express";
// import jwt, { type JwtPayload } from "jsonwebtoken";
// import { createClerkClient, verifyToken } from "@clerk/backend";
// import {prisma} from "../../packages/db/prisma/db"

// const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
// const JWT_SECRET = process.env.JWT_SECRET!;

// declare global {
//   namespace Express {
//     interface Request {
//       id: number;
//       authType?: "jwt" | "clerk";
//     }
//   }
// }

// export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Unauthorized: No token provided" });
//     }

//     const token = authHeader.split(" ")[1];

//    // Try verifying your own JWT
    
//     try {
//       const decoded = jwt.verify(token!, JWT_SECRET) as unknown as JwtPayload & { id: number };

//       req.id = decoded.id;
//       req.authType = "jwt";
//       return next();
//     } catch {
     
//     }

 
//     try {
//       const verified = await verifyToken(token!, {
//         secretKey: process.env.CLERK_SECRET_KEY!,
//       });

//       const clerkId = verified.sub;
//       const clerkUser = await clerk.users.getUser(clerkId);
//       const email =
//         clerkUser.primaryEmailAddress?.emailAddress ??
//         clerkUser.emailAddresses[0]?.emailAddress ??
//         undefined;

//       // 📌 Sync Clerk user → Prisma User table
//       let existing = email
//         ? await prisma.user.findFirst({
//             where: { email },
//           })
//         : null;

//       if (!existing) {
//         existing = await prisma.user.create({
//           data: {
//             email: email ?? `${clerkId}@clerk.generated`,
//             name: clerkUser.firstName ?? "Unknown User",
//             password: "CLERK", // never used
//           },
//         });
//       }

//       req.id = existing.id; // Use your OWN user table id
//       req.authType = "clerk";

//       return next();
//     } catch {
     
//     }

//     return res.status(401).json({ message: "Unauthorized: Invalid token" });

//   } catch (error) {
//     console.error(error);
//     return res.status(401).json({ message: "Unauthorized" });
//   }
// }
import { type NextFunction, type Request, type Response } from "express";
const JWT_SECRET = process.env.JWT_SECRET!;
import jwt, {type JwtPayload } from "jsonwebtoken";

declare global {
    namespace Express { interface Request { id: number } }
}

interface DecodedToken extends JwtPayload{
id: number;
}

export async function authMiddleware (req:Request, res:Response, next:NextFunction){
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).json({message:"Unauthorized: No token provided"});
        }
        const secret = JWT_SECRET;
        const token = authHeader.split(" ")[1];
        if(!token){
            return res.status(401).json({error:"No token provided"});
        }
        const decoded = await new Promise<DecodedToken>((resolve, reject)=>{
            jwt.verify(token, secret,(err, decodedToken)=>{
                if(err){
                    return reject(err);
                }
                resolve(decodedToken as DecodedToken)
            })
        });
        
        req.id = decoded.id;
        next();

    } catch (error) {
        return res.status(401).json({message:"Unauthorized: Invalid token"})
    }
}