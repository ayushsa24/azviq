import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface AiTriggerOptions {
    onTrigger: (pos: { top: number, left: number, from: number }) => void;
}

export const AiTrigger = Extension.create<AiTriggerOptions>({
    name: 'aiTrigger',

    addOptions() {
        return {
            onTrigger: () => { },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('aiTrigger'),
                props: {
                    handleKeyDown: (view, event) => {
                        if (event.key === ' ') {
                            const { state } = view;
                            const { selection } = state;
                            
                            if (!selection.empty) return false;

                            // Check if we are in an empty paragraph
                            const from = selection.from;
                            const $pos = state.doc.resolve(from);
                            const parent = $pos.parent;

                            if (parent.type.name === 'paragraph' && parent.textContent.trim() === '') {
                                // Get coordinates for the popover
                                const coords = view.coordsAtPos(from);
                                const editorRect = view.dom.getBoundingClientRect();

                                // Trigger the callback with the editor's left edge and starting position
                                this.options.onTrigger({
                                    top: coords.top,
                                    left: editorRect.left,
                                    from: from,
                                });

                                // Prevent the space from actually being typed
                                event.preventDefault();
                                return true;
                            }
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});
