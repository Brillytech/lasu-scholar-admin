import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { MathfieldElement } from "mathlive";

/*
  Visual equation editor.

  The point of this modal is that an admin never has to know LaTeX: they build
  the equation on MathLive's virtual keyboard and the LaTeX is generated for
  them. It is shown read-only underneath purely for confidence, and handed back
  to the caller to store in a data-latex attribute.

  The <math-field> element is created imperatively rather than as JSX. React
  does not pass props to custom elements as properties, and MathLive's
  configuration lives on element properties and statics -- doing it by hand is
  both simpler and less brittle than fighting the JSX typing for a web
  component.
*/

/*
  Statics must be set before any MathfieldElement is constructed.
  Fonts are self-hosted from public/mathlive/fonts (copied from the package)
  so nothing is fetched from a CDN at runtime. Sounds are disabled outright,
  which also avoids 404s for audio we never want.
*/
MathfieldElement.fontsDirectory = "/mathlive/fonts";
MathfieldElement.soundsDirectory = null;

type EquationBuilderProps = {
  open: boolean;
  initialLatex?: string;
  onCancel: () => void;
  onInsert: (latex: string) => void;
};

export default function EquationBuilder({
  open,
  initialLatex = "",
  onCancel,
  onInsert,
}: EquationBuilderProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);

  const [latex, setLatex] = useState(initialLatex);

  useEffect(() => {
    if (!open) return;

    const host = hostRef.current;

    if (!host) return;

    const field = new MathfieldElement();

    /*
      "manual" stops MathLive deciding for itself whether to show the keyboard
      (it defaults to touch devices only). We want the palette visible on
      desktop, since typing LaTeX by hand is the thing we are avoiding.
    */
    field.mathVirtualKeyboardPolicy = "manual";
    field.style.width = "100%";
    field.style.fontSize = "1.5rem";
    field.value = initialLatex;

    const handleInput = () => setLatex(field.getValue("latex"));
    field.addEventListener("input", handleInput);

    host.appendChild(field);
    fieldRef.current = field;

    setLatex(initialLatex);

    field.focus();
    window.mathVirtualKeyboard.show();

    return () => {
      window.mathVirtualKeyboard.hide();
      field.removeEventListener("input", handleInput);
      field.remove();
      fieldRef.current = null;
    };
  }, [open, initialLatex]);

  if (!open) return null;

  function handleInsert() {
    const value = fieldRef.current?.getValue("latex")?.trim() || "";

    if (!value) return;

    onInsert(value);
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              Equation
            </p>
            <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
              {initialLatex ? "Edit Equation" : "Insert Equation"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Build the equation with the keyboard below. No LaTeX needed.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={hostRef}
          className="min-h-[96px] rounded-2xl border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-white/10"
        />

        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
            LaTeX (generated)
          </p>
          <code className="block overflow-x-auto rounded-2xl bg-navy/90 px-4 py-3 text-xs font-bold text-cream dark:bg-slate-950/70">
            {latex || "\u00a0"}
          </code>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-orange/10 bg-soft px-5 py-3 text-sm font-black text-navy transition hover:bg-orange hover:text-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-orange"
          >
            Cancel
          </button>

          <button
            onClick={handleInsert}
            disabled={!latex.trim()}
            className="rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {initialLatex ? "Update Equation" : "Insert Equation"}
          </button>
        </div>
      </div>
    </div>
  );
}
