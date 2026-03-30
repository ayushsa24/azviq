import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    CodeSquare,
    Table
} from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

// 1. Define the commands we want to provide
export const getSuggestionItems = ({ query }: { query: string }) => {
    return [
        {
            title: 'Heading 1',
            description: 'Big section heading',
            icon: <Heading1 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading',
            icon: <Heading2 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading',
            icon: <Heading3 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list',
            icon: <List size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a numbered list',
            icon: <ListOrdered size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote',
            icon: <Quote size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('blockquote').run();
            },
        },
        {
            title: 'Code Block',
            description: 'Capture a code snippet',
            icon: <CodeSquare size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('codeBlock').run();
            },
        },
        {
            title: 'Table',
            description: 'Insert a 3x3 table',
            icon: <Table size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            },
        },
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
};

// 2. The React Component that renders the dropdown list
export const CommandList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: any) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    if (!props.items.length) {
        return null;
    }

    return (
        <div className="flex flex-col bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-2xl rounded-xl overflow-hidden py-1.5 min-w-[220px]">
            <div className="px-3 py-1 text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase tracking-widest border-b border-[#E8E5E0] dark:border-[#3A3A3A] bg-[#F9F8F6] dark:bg-[#1A1A1A]">
                Basic Blocks
            </div>
            <div className="flex flex-col max-h-[300px] overflow-y-auto mt-0.5 p-1 gap-0.5">
                {props.items.map((item: any, index: number) => (
                    <button
                        key={index}
                        className={`flex items-center gap-2.5 px-2 py-1.5 text-left rounded-lg transition-all ${index === selectedIndex
                            ? 'bg-[#F0EDE8] dark:bg-[#1A1A1A] text-[#252525] dark:text-white'
                            : 'text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A]'
                            }`}
                        onClick={() => selectItem(index)}
                    >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors ${index === selectedIndex
                            ? 'bg-white dark:bg-[#252525] border-[#D1CEC8] dark:border-[#545454] text-[#252525] dark:text-white'
                            : 'bg-[#F9F8F6] dark:bg-white/5 border-[#E8E5E0] dark:border-[#3A3A3A] text-[#545454] dark:text-[#7D7D7D]'
                            }`}>
                            {item.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate">{item.title}</span>
                            <span className="text-[10px] text-[#7D7D7D] dark:text-[#888] truncate">{item.description}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
});

CommandList.displayName = "CommandList";

// 3. Define the actual Tiptap Extension
export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

// 4. Configuration for the suggestion plugin (how it renders)
export const slashCommandSuggestionOptions = {
    items: getSuggestionItems,
    render: () => {
        let component: ReactRenderer;
        let popup: TippyInstance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: any) {
                component.updateProps(props);

                if (!props.clientRect) return;

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }
                return (component.ref as any)?.onKeyDown(props);
            },

            onExit() {
                popup[0].destroy();
                component.destroy();
            },
        };
    },
};
