import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function CodeBlockComponent({ node: { attrs, textContent } }: any) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText(textContent || "")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <NodeViewWrapper className="relative group rounded-xl overflow-hidden bg-[#1E1E1E] border border-white/10 my-6 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-white/5 select-none text-[#A3A3A3] text-xs font-mono font-medium tracking-wider uppercase">
                <span>{attrs.language || 'text'}</span>
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
                <NodeViewContent as="code" className="!bg-transparent font-mono" />
            </pre>
        </NodeViewWrapper>
    )
}
