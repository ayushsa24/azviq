import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Copy, Check, ChevronDown, Play, Loader2, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
    'text', 'python', 'java', 'c', 'cpp', 'javascript', 'typescript', 'html', 'css', 'json', 'markdown',
    'csharp', 'php', 'ruby', 'rust', 'go', 'sql', 'bash'
]

const RUNNABLE_LANGUAGES = [
    'python', 'java', 'c', 'cpp', 'javascript', 'typescript', 'csharp', 'php', 'ruby', 'rust', 'go', 'bash'
]

export function CodeBlockComponent({ node, updateAttributes, extension }: any) {
    const { attrs } = node
    const [copied, setCopied] = useState(false)
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [output, setOutput] = useState<string | null>(null)
    const selectorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsSelectorOpen(false)
            }
        }

        if (isSelectorOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isSelectorOpen])

    // Auto-detect language if it's 'text' or not set
    useEffect(() => {
        if ((!attrs.language || attrs.language === 'text') && node.textContent.trim()) {
            const lowlight = extension.options.lowlight;
            if (lowlight) {
                try {
                    // Try to detect the language
                    const result = lowlight.highlightAuto(node.textContent);
                    if (result.data.language && LANGUAGES.includes(result.data.language)) {
                        // Only update if we are sure it's a known language
                        updateAttributes({ language: result.data.language });
                    }
                } catch (e) {
                    // Ignore detection errors
                }
            }
        }
    }, [attrs.language, node.textContent, extension.options.lowlight, updateAttributes]);

    const copyToClipboard = () => {
        const text = node.textContent || ""
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const runCode = async () => {
        setIsRunning(true)
        setOutput("Running...")
        try {
            const code = node.textContent || ""
            
            const response = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    language: attrs.language
                })
            })
            
            const data = await response.json()
            
            if (!response.ok || data.error) {
                setOutput(`Error: ${data.error || 'Execution failed'}`)
                return
            }

            if (data.build_result === 'failure') {
                setOutput(data.build_stderr || "Build failed")
            } else if (data.stderr) {
                setOutput(data.stderr)
            } else {
                setOutput(data.stdout || "Program finished correctly with no output.")
            }

        } catch (e) {
            setOutput("Failed to run code. Please check your connection.")
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <NodeViewWrapper className="relative group rounded-xl bg-[#1E1E1E] border border-white/10 my-6 shadow-md">
            <div contentEditable={false} className={`flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-white/5 select-none text-[#A3A3A3] text-xs font-mono font-medium tracking-wider uppercase rounded-t-xl transition-all ${isSelectorOpen ? 'z-[101]' : 'z-10'}`}>
                <div className="relative" ref={selectorRef}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsSelectorOpen(!isSelectorOpen);
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            // Removed preventDefault to allow natural touch scrolling/gestures
                        }}
                        className="flex items-center gap-1.5 hover:text-[#CFCFCF] transition-colors uppercase cursor-pointer py-1"
                    >
                        {attrs.language || 'text'}
                        <ChevronDown size={12} />
                    </button>
                    {isSelectorOpen && (
                        <div 
                            className="absolute top-full -left-2 mt-1 w-36 max-h-56 overflow-y-auto bg-[#252525] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 grid grid-cols-1 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200"
                            style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                            {['text', ...RUNNABLE_LANGUAGES, 'markdown'].map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateAttributes({ language: lang })
                                        setIsSelectorOpen(false)
                                    }}
                                    className={`px-2 py-2 text-left rounded-md hover:bg-[#3A3A3A] active:bg-[#4A4A4A] transition-all text-xs ${attrs.language === lang || (!attrs.language && lang === 'text') ? 'text-white font-bold bg-[#4A4A4A]' : 'text-[#A3A3A3]'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {RUNNABLE_LANGUAGES.includes(attrs.language) && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                runCode();
                            }}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                runCode();
                            }}
                            disabled={isRunning}
                            className="p-1.5 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded-md transition-all flex items-center gap-1.5 mr-1 select-none active:scale-95 touch-none"
                            title="Run code"
                        >
                            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />}
                            <span className="sr-only sm:not-sr-only sm:inline-block capitalize tracking-normal font-bold">Run</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard();
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyToClipboard();
                        }}
                        className="p-1.5 hover:bg-[#3A3A3A] hover:text-[#CFCFCF] rounded-md transition-colors flex items-center gap-1.5 select-none active:scale-95 touch-none"
                        title="Copy code"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        <span className="sr-only sm:not-sr-only sm:inline-block capitalize tracking-normal">{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                </div>
            </div>
            <pre spellCheck={false} className={`!m-0 !mt-0 !bg-transparent pt-4 pb-4 pl-8 pr-4 overflow-x-auto text-[13px] leading-relaxed ${output === null ? 'rounded-b-xl' : ''} ${attrs.language === 'text' || !attrs.language ? 'text-indigo-200/90' : 'text-[#D4D4D4]'}`}>
                <NodeViewContent as={"code" as any} className="!bg-transparent font-mono" />
            </pre>
            {output !== null && (
                <div contentEditable={false} className="border-t border-white/10 bg-[#1A1A1A] p-4 text-[13px] font-mono relative rounded-b-xl overflow-hidden">
                    <div className="flex items-center justify-between mb-2 select-none">
                        <span className="text-[#A3A3A3] text-xs font-bold uppercase tracking-wider">Output</span>
                        <button onClick={() => setOutput(null)} className="text-[#A3A3A3] hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                    <pre className="text-[#E5E5E5] whitespace-pre-wrap break-words !m-0 !p-0 !bg-transparent overflow-y-auto max-h-[300px]">{output}</pre>
                </div>
            )}
        </NodeViewWrapper>
    )
}
