"use client";

import { useState } from "react";
import type { User } from "../types/user";

export function useUserStore() {
  const [user, setUser] = useState<User | null>(null);
  return { user, setUser };
}
