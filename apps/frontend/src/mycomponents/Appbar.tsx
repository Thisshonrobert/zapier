"use client";
import React from "react";
import { LinkButton } from "./buttons/LinkButton";
import { usePathname, useRouter } from "next/navigation";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Appbar = () => {
  const router = useRouter();
  const currentPath = usePathname();
  
  // Routes where login/signup buttons should be hidden and Avatar shown
  const isAuthenticatedRoute = currentPath !== '/' && currentPath !== '/login' && currentPath !== '/signup';
  
  // Generate a random avatar image URL
  const randomAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
  
  return (
    <div className="flex border-b justify-between p-4">
      <div className="flex  flex-col justify-center ">
       <img src="/Zapier-logo.png" alt="Zapier Logo" className="w-30 h-8" />
      </div>
      <div className="flex gap-4  items-center text-gray-700">
        <LinkButton onClick={() => {}}>Contact Sales</LinkButton>
        {isAuthenticatedRoute ? (
          <Avatar>
            <AvatarImage src={randomAvatarUrl} alt="User Avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        ) : currentPath === '/' ? (
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