"use client";
export const Input = ({
  label,
  placeholder,
  onChange,
  type,
}: {
  label: string;
  placeholder: string;
  onChange: (e: any) => void;
  type?: "text" | "password" | "email";
}) => {
  return (
    <div className="text-sm  pt-2 pb-1">
      * <label>{label}</label>
      <input
        className="border rounded px-4 py-2 w-full border-black"
        type={type}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
};