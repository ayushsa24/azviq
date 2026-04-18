import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code, language } = await req.json();

        // Map languages properly for paiza.io
        const langMap: Record<string, string> = {
            'python': 'python3',
            'cpp': 'cpp',
            'c#': 'csharp',
            'csharp': 'csharp',
            'javascript': 'javascript',
            'typescript': 'javascript', // Fallback since native TS isn't on free paiza easily
            'bash': 'bash',
            'java': 'java',
            'ruby': 'ruby',
            'go': 'go',
            'rust': 'rust',
            'php': 'php'
        };
        const paizaLang = langMap[language] || language;

        const createRes = await fetch('https://api.paiza.io/runners/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_code: code,
                language: paizaLang,
                api_key: 'guest'
            })
        });

        const createData = await createRes.json();
        if (createData.error) {
            return NextResponse.json({ error: createData.error.message || 'Language not supported' }, { status: 400 });
        }

        const runnerId = createData.id;

        // Poll for results (max 8 seconds to prevent Vercel 10s default timeouts)
        for (let i = 0; i < 8; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const statusRes = await fetch(`https://api.paiza.io/runners/get_details?id=${runnerId}&api_key=guest`);
            const statusData = await statusRes.json();

            if (statusData.status === 'completed') {
                return NextResponse.json(statusData);
            }
        }

        return NextResponse.json({ error: 'Execution timed out. Code took too long to run.' }, { status: 408 });
    } catch (error: any) {
        console.error("Run Code Proxy Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to connect to compiler' }, { status: 500 });
    }
}
