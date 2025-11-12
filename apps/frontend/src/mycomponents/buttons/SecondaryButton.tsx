import { ReactNode } from "react";

export const SecondaryButton = ({
  children,
  onClick,
  size = "small",
}: {
  children: ReactNode;
  onClick: () => void;
  size?: "big" | "small";
}) => {
  return (
    <div
      onClick={onClick}
      className={`${size === "small" ? "text-sm" : "text-xl"}
        ${size === "small" ? "px-4 py-2" : "px-16 py-2 "}
       border border-black hover:shadow-md cursor-pointer
        rounded-3xl font-bold text-black `}
    >
      {children}
    </div>
  );
};