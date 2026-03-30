import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 text-[#1A1A1A] placeholder-[#9E9E9E] transition-all focus:border-[#252525] focus:outline-none focus:ring-2 focus:ring-[#252525]/10 dark:border-[#333] dark:bg-[#1A1A1A] dark:text-[#CFCFCF] dark:placeholder-[#545454] dark:focus:border-[#7D7D7D] dark:focus:ring-[#7D7D7D]/10 ${
        props.className || ""
      }`}
    />
  );
}
