import { useSelectColors } from "../hooks/useIsDarkMode";

/*
  The Input / Textarea / Select trio that the admin pages use inside modals.

  These were defined inline at the bottom of Questions.tsx (and, near
  identically, in Courses/Materials/Notifications). Extracting them here so the
  question modals can move into their own files without carrying a private copy
  of each field. The markup and classes are unchanged, so nothing shifts
  visually.

  Only Questions.tsx has been pointed at this file; the other three pages still
  have their own copies and can be migrated whenever they are next touched.
*/

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function Input({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      />
    </label>
  );
}

export function Textarea({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-orange/10 bg-soft px-4 py-3 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      />
    </label>
  );
}

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = FieldProps & {
  options: SelectOption[];
};

export function Select({ label, value, onChange, options }: SelectProps) {
  /*
    selectColors is applied to the <select> AND every <option>: Chrome does not
    reliably honour the CSS color-scheme property for the option popup list.
  */
  const selectColors = useSelectColors();

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectColors}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      >
        {options.length === 0 && (
          <option value="" style={selectColors}>
            No option available
          </option>
        )}

        {options.map((item) => (
          <option key={item.value} value={item.value} style={selectColors}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
