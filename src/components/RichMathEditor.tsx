import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Mathematics } from "@tiptap/extension-mathematics";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Sigma,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import "katex/dist/katex.min.css";
import EquationBuilder from "./EquationBuilder";
import { contentHtmlToText } from "./RenderedContent";

/*
  Rich text editor for theory questions: formatting plus KaTeX-rendered math.

  Equations are never typed as LaTeX. The toolbar's Sigma button opens
  EquationBuilder (MathLive's visual keyboard), and clicking an existing
  equation reopens it for editing. What gets stored is TipTap HTML with the
  equation held as <span data-type="inline-math" data-latex="...">.

  The enabled marks/nodes are deliberately kept in step with the allowlist in
  RenderedContent -- headings, blockquotes, rules and links are switched off
  here precisely because the sanitizer would strip them on display, and an
  admin should never be able to author something that silently disappears.
*/

type MathTarget = {
  latex: string;
  /* null when inserting fresh; a document position when editing in place. */
  pos: number | null;
};

type RichMathEditorProps = {
  label: string;
  value: string;
  onChange: (next: { html: string; text: string }) => void;
  minHeight?: number;
};

export default function RichMathEditor({
  label,
  value,
  onChange,
  minHeight = 180,
}: RichMathEditorProps) {
  const [mathTarget, setMathTarget] = useState<MathTarget | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
      }),
      Mathematics.configure({
        katexOptions: { throwOnError: false },
        inlineOptions: {
          onClick: (node, pos) =>
            setMathTarget({ latex: node.attrs.latex || "", pos }),
        },
        blockOptions: {
          onClick: (node, pos) =>
            setMathTarget({ latex: node.attrs.latex || "", pos }),
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-full text-sm font-semibold leading-7 text-navy outline-none dark:text-white",
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();

      /*
        contentHtmlToText rather than instance.getText(): math nodes are atoms
        and contribute nothing to getText(), so a question that is mostly an
        equation would end up with empty search text. This substitutes each
        equation's LaTeX instead.
      */
      onChange({ html, text: contentHtmlToText(html) });
    },
  });

  /*
    Sync external changes (opening the modal on an existing question) without
    fighting the editor while it is being typed in.

    The isDestroyed guard is load-bearing, not defensive noise: under
    StrictMode the editor is torn down and recreated, and getHTML() on a
    destroyed instance throws inside ProseMirror's DOMSerializer because the
    schema is already null.
  */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const incoming = value || "";

    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  function applyEquation(latex: string) {
    if (!editor) return;

    if (!mathTarget || mathTarget.pos === null) {
      editor.chain().focus().insertInlineMath({ latex }).run();
    } else {
      editor
        .chain()
        .focus()
        .setNodeSelection(mathTarget.pos)
        .updateInlineMath({ latex })
        .run();
    }

    setMathTarget(null);
  }

  const toolbarButton =
    "grid h-9 w-9 place-items-center rounded-xl text-navy transition hover:bg-orange hover:text-white dark:text-white";
  const activeButton = "bg-orange text-white";
  const idleButton = "bg-soft dark:bg-white/10";

  return (
    <div className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>

      <div className="overflow-hidden rounded-2xl border border-orange/10 bg-soft transition focus-within:border-orange dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-orange/10 px-3 py-2 dark:border-white/10">
          <button
            type="button"
            title="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`${toolbarButton} ${
              editor?.isActive("bold") ? activeButton : idleButton
            }`}
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            title="Italic"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`${toolbarButton} ${
              editor?.isActive("italic") ? activeButton : idleButton
            }`}
          >
            <Italic size={15} />
          </button>

          <button
            type="button"
            title="Underline"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`${toolbarButton} ${
              editor?.isActive("underline") ? activeButton : idleButton
            }`}
          >
            <UnderlineIcon size={15} />
          </button>

          <span className="mx-1 h-6 w-px bg-orange/10 dark:bg-white/10" />

          <button
            type="button"
            title="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`${toolbarButton} ${
              editor?.isActive("bulletList") ? activeButton : idleButton
            }`}
          >
            <List size={15} />
          </button>

          <button
            type="button"
            title="Numbered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`${toolbarButton} ${
              editor?.isActive("orderedList") ? activeButton : idleButton
            }`}
          >
            <ListOrdered size={15} />
          </button>

          <span className="mx-1 h-6 w-px bg-orange/10 dark:bg-white/10" />

          <button
            type="button"
            onClick={() => setMathTarget({ latex: "", pos: null })}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange/10 px-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
          >
            <Sigma size={15} />
            Insert Equation
          </button>

          <span className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              title="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              className={`${toolbarButton} ${idleButton}`}
            >
              <Undo2 size={15} />
            </button>

            <button
              type="button"
              title="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              className={`${toolbarButton} ${idleButton}`}
            >
              <Redo2 size={15} />
            </button>
          </span>
        </div>

        <div
          className="cursor-text px-4 py-3"
          style={{ minHeight }}
          onClick={() => editor?.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-400">
        Click an equation to edit it.
      </p>

      <EquationBuilder
        open={mathTarget !== null}
        initialLatex={mathTarget?.latex || ""}
        onCancel={() => setMathTarget(null)}
        onInsert={applyEquation}
      />
    </div>
  );
}
