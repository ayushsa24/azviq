import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const LANGUAGES = [
    'text', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown',
    'java', 'cpp', 'csharp', 'php', 'ruby', 'rust', 'go', 'sql', 'bash'
]

export function CodeBlockComponent({ node: { attrs }, updateAttributes, extension }: any) {
    const [copied, setCopied] = useState(false)
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)

    const copyToClipboard = () => {
        const text = (document.querySelector(`[data-node-view-wrapper] pre code`) as HTMLElement)?.innerText || ""
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <NodeViewWrapper className="relative group rounded-xl overflow-hidden bg-[#1E1E1E] border border-white/10 my-6 shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-white/5 select-none text-[#A3A3A3] text-xs font-mono font-medium tracking-wider uppercase">
                <div className="relative">
                    <button
                        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                        className="flex items-center gap-1.5 hover:text-[#CFCFCF] transition-colors uppercase"
                    >
                        {attrs.language || 'text'}
                        <ChevronDown size={12} />
                    </button>

                    {isSelectorOpen && (
                        <div className="absolute top-full left-0 mt-1 w-40 max-h-48 overflow-y-auto bg-[#252525] border border-white/10 rounded-lg shadow-xl z-50 p-1 grid grid-cols-1 custom-scrollbar">
                            {LANGUAGES.sort().map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => {
                                        updateAttributes({ language: lang })
                                        setIsSelectorOpen(false)
                                    }}
                                    className={`px-3 py-1.5 text-left rounded-md hover:bg-[#3A3A3A] transition-colors ${attrs.language === lang ? 'text-white font-bold bg-[#3A3A3A]' : 'text-[#A3A3A3]'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={copyToClipboard}
                    className="p-1.5 hover:bg-[#3A3A3A] hover:text-[#CFCFCF] rounded-md transition-colors flex items-center gap-1.5"
                    title="Copy code"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    <span className="sr-only sm:not-sr-only sm:inline-block capitalize tracking-normal">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>
            <pre className="!m-0 !mt-0 !bg-transparent p-4 overflow-x-auto text-[#D4D4D4] text-[13px] leading-relaxed">
                <NodeViewContent as={"code" as any} className="!bg-transparent font-mono" />
            </pre>
        </NodeViewWrapper>
    )
}
