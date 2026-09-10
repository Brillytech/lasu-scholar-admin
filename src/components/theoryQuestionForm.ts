/*
  Form shape for the theory question modal.

  Deliberately in its own module rather than exported from
  TheoryQuestionModal.tsx: Questions.tsx needs `emptyTheoryForm` as a VALUE to
  initialise state, and a static value import of the modal would statically
  pull in TipTap, MathLive, KaTeX and DOMPurify -- silently defeating the
  React.lazy boundary that keeps them out of the initial bundle. (It did
  exactly that once; the build went from a 195 kB gzip entry chunk to 632 kB.)

  This file must stay free of component imports.
*/

export type TheoryFormState = {
  course_id: string;
  topic_id: string;
  question_html: string;
  question_text: string;
  answer_html: string;
  answer_text: string;
  marks: string;
};

export const emptyTheoryForm: TheoryFormState = {
  course_id: "",
  topic_id: "",
  question_html: "",
  question_text: "",
  answer_html: "",
  answer_text: "",
  marks: "",
};
