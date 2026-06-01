import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { debounce } from '@/lib/utils';

interface DescriptionEditorProps {
  content: string;
  onSave: (content: string) => void;
}

export function DescriptionEditor({ content, onSave }: DescriptionEditorProps) {
  const debouncedSave = useCallback(
    debounce((html: string) => {
      onSave(html);
    }, 1000),
    [onSave]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add a description…',
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'min-h-[100px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  return (
    <div className="bg-[#111113] border border-white/[0.04] rounded-lg p-[14px] hover:border-white/[0.08] transition-colors duration-150 focus-within:border-white/[0.12]">
      <EditorContent editor={editor} />
    </div>
  );
}
