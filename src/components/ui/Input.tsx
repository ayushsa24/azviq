import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
