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
    Table,
    CheckSquare,
    Info,
    LayoutGrid,
    Check
} from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

// 1. Define the commands we want to provide
export const getSuggestionItems = ({ query }: { query: string }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return [
        {
            title: 'Text',
            description: 'Start with plain text',
            icon: <div className="text-sm font-bold">P</div>,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).setNode('paragraph').run();
            },
        },
        {
            title: 'Heading 1',
            description: 'Big section heading',
            icon: <Heading1 size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading',
            icon: <Heading2 size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading',
            icon: <Heading3 size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list',
            icon: <List size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a numbered list',
            icon: <ListOrdered size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Coding',
            description: 'Write & Run Code Snippets',
            icon: <CodeSquare size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).setNode('codeBlock').run();
            },
        },
        {
            title: 'Table',
            description: 'Insert a 3x3 table',
            icon: <Table size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            },
        },
        {
            title: 'Checklist',
            description: 'Action items for your study',
            icon: <CheckSquare size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).toggleTaskList().run();
            },
        },
        {
            title: 'Important Note',
            description: 'Key takeaway or definition',
            icon: <Info size={18} />,
            command: ({ editor, range }: any) => {
                const chain = editor.chain();
                if (!isMobile) chain.focus();
                chain.deleteRange(range).insertContent('<div class="callout-block"><p><strong>KEY NOTE:</strong> </p></div>').run();
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
        // Automatically select the currently active block type
        const activeIndex = props.items.findIndex((item: any) => {
            return (item.title === 'Text' && props.editor.isActive('paragraph') && !props.editor.isActive('bulletList') && !props.editor.isActive('orderedList') && !props.editor.isActive('taskList')) ||
                   (item.title === 'Heading 1' && props.editor.isActive('heading', { level: 1 })) ||
                   (item.title === 'Heading 2' && props.editor.isActive('heading', { level: 2 })) ||
                   (item.title === 'Heading 3' && props.editor.isActive('heading', { level: 3 })) ||
                   (item.title === 'Bullet List' && props.editor.isActive('bulletList')) ||
                   (item.title === 'Numbered List' && props.editor.isActive('orderedList')) ||
                   (item.title === 'Coding' && props.editor.isActive('codeBlock')) ||
                   (item.title === 'Checklist' && props.editor.isActive('taskList'));
        });

        if (activeIndex !== -1) {
            setSelectedIndex(activeIndex);
        } else {
            setSelectedIndex(0);
        }
    }, [props.items, props.editor]);

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
        <div className="flex flex-col bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] shadow-xl rounded-xl overflow-hidden min-w-[200px]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-[#444]">
                <LayoutGrid size={13} className="text-[#252525] dark:text-[#BABABA]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D] dark:text-[#BABABA]">Basic Blocks</span>
            </div>
            <div className="flex flex-col max-h-[300px] overflow-y-auto p-1 gap-0.5 scrollbar-compact">
                {(() => {
                    const getActiveBlock = () => {
                        if (props.editor.isActive('heading', { level: 1 })) return 'Heading 1';
                        if (props.editor.isActive('heading', { level: 2 })) return 'Heading 2';
                        if (props.editor.isActive('heading', { level: 3 })) return 'Heading 3';
                        if (props.editor.isActive('bulletList')) return 'Bullet List';
                        if (props.editor.isActive('orderedList')) return 'Numbered List';
                        if (props.editor.isActive('codeBlock')) return 'Coding';
                        if (props.editor.isActive('taskList')) return 'Checklist';
                        if (props.editor.isActive('paragraph')) return 'Text';
                        return null;
                    };
                    const activeBlockTitle = getActiveBlock();

                    return props.items.map((item: any, index: number) => {
                        const isActive = item.title === activeBlockTitle;

                        return (
                            <button
                                key={index}
                                className={`flex items-center gap-2.5 px-2 py-1.5 text-left rounded-lg transition-all ${index === selectedIndex
                                    ? 'bg-[#F0EDE8] dark:bg-[#333] text-[#252525] dark:text-white'
                                    : 'text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A]'
                                    }`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectItem(index)}
                            >
                                <div className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors ${index === selectedIndex
                                    ? 'bg-white dark:bg-[#252525] border-[#D1CEC8] dark:border-[#545454] text-[#252525] dark:text-white'
                                    : 'bg-[#F9F8F6] dark:bg-white/5 border-[#E8E5E0] dark:border-[#3A3A3A] text-[#545454] dark:text-[#7D7D7D]'
                                    }`}>
                                    {item.icon}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs font-semibold truncate">{item.title}</span>
                                    <span className="text-[10px] text-[#7D7D7D] dark:text-[#888] truncate">{item.description}</span>
                                </div>
                                {isActive && (
                                    <Check size={12} className="text-green-500 shrink-0" />
                                )}
                            </button>
                        );
                    });
                })()}
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

                // On mobile, hide the keyboard to show the full menu
                if (window.innerWidth < 768) {
                    props.editor.commands.blur();
                }
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
