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
                    handleTextInput: (view, from, to, text) => {
                        const { state } = view;
                        const { selection } = state;
                        const { empty } = selection;

                        // Only trigger if typing ' ' (space)
                        if (text !== ' ' || !empty) {
                            return false;
                        }

                        // Check if we are in an empty paragraph
                        const $pos = state.doc.resolve(from);
                        const parent = $pos.parent;

                        if (parent.type.name === 'paragraph' && parent.textContent.length === 0) {
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
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});
