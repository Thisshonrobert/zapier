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