"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <SWRConfig
                value={{
                    revalidateOnFocus: false,
                    dedupingInterval: 10000,
                    fetcher: (url: string) => fetch(url).then(res => res.json())
                }}
            >
                {children}
            </SWRConfig>
        </SessionProvider>
    );
}
