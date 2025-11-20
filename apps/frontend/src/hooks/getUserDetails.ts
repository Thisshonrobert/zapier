import { BACKEND_URL } from "@/config";
import axios from "axios";
export const getUserDetails = async () => {
    const token = localStorage.getItem("token");
    const userDetails = await axios.get(`${BACKEND_URL}/api/v1/user/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return userDetails.data;
}


// type userDetails =  {

// }

















// will be implemented in future 
// import { BACKEND_URL } from "@/config";

// import { auth } from '@clerk/nextjs/server'


// export type UserDetails = {
//     userId: number;
//     authType: "clerk" | "jwt";
//     user: {
//         id: number;
//         name: string;
//         email: string;
//         imageUrl?: string | "";
//     };
// }
// let clerkToken1:string="";

// async function clerkTokenfinder(){
//     const { getToken } = await auth()
    
//      clerkToken1 = await getToken();

// }




// export const getUserDetails = async (): Promise<UserDetails | null> => {
   
//   let tokenToSend = clerkToken1;

//   // 2️⃣ If no clerk token, fall back to your JWT
//   if (!tokenToSend) {
//     tokenToSend = localStorage.getItem("token") || "";
//   }

//   // 3️⃣ Call backend with whatever token exists
//   const response = await fetch(`${BACKEND_URL}/api/v1/user/auth/me`, {
//     headers: {
//       Authorization: `Bearer ${tokenToSend}`,
//     },
//   });

//   if (!response.ok) return null;

//   return response.json();
// };


