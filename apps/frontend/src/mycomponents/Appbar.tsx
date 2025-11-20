"use client";
import React, { use, useState, useEffect } from "react";
import { LinkButton } from "./buttons/LinkButton";
import { usePathname, useRouter } from "next/navigation";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
// import { UserButton } from '@clerk/nextjs'
// import { getUserDetails, UserDetails } from "@/hooks/getUserDetails";

const Appbar = () => {
  const router = useRouter();
  const currentPath = usePathname();
  // const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  // useEffect(() => {
  //   getUserDetails().then(setUserDetails);
  // }, []);

  // if (!userDetails) return null; // or loader

  // const { authType, user } = userDetails;

  // Routes where login/signup buttons should be hidden and Avatar shown
  const isAuthenticatedRoute = currentPath !== '/' && currentPath !== '/login' && currentPath !== '/signup';
  
 
  return (
    <div className="flex border-b justify-between p-4">
      <div className="flex  flex-col justify-center ">
       <img src="/Zapier-logo.png" alt="Zapier Logo" className="w-30 h-8" />
      </div>
      <div className="flex gap-4  items-center text-gray-700">
        <LinkButton onClick={() => {}}>Contact Sales</LinkButton>
         {isAuthenticatedRoute ? 
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
           <Avatar>
            <AvatarImage src={"https://github.com/shadcn.png" } />
            <AvatarFallback>User</AvatarFallback>
          </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
          <DropdownMenuItem >
          <Button variant="outline" onClick={()=>{
            localStorage.setItem("token","");
            router.push("/");
          }}>Log out</Button>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
          
          </DropdownMenu>
        
         : currentPath === '/' ? ( 
          <div className="flex space-x-2">
            <LinkButton
              onClick={() => {
                router.push("/login");
              }}
            >
              Log in
            </LinkButton>
            <PrimaryButton
              onClick={() => {
                router.push("/signup");
              }}
            >
              Signup
            </PrimaryButton>
          </div>
        ) : currentPath === '/login' ? (
          <PrimaryButton
            onClick={() => {
              router.push("/signup");
            }}
          >
            Signup
          </PrimaryButton>
        ) : (
          <LinkButton
            onClick={() => {
              router.push("/login");
            }}
          >
            Log in
          </LinkButton>
        )}
      </div>
    </div>
  );
};

export default Appbar;