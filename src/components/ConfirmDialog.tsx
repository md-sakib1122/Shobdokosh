import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Called whenever the dialog closes (after onConfirm too): clear the caller's state here. */
  onCancel: () => void;
}

/**
 * Destructive confirm (DESIGN.md › Dialog and confirm-delete): role="alertdialog",
 * Cancel takes initial focus, Esc and the scrim cancel; on phones the footer stacks
 * with the action on top while DOM order stays Cancel → action.
 */
export default function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const uid = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-body`}
      className="dialog"
      onClose={onCancel}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="p-6">
        <h2 id={`${uid}-title`} className="text-xl font-medium">{title}</h2>
        <div id={`${uid}-body`} className="mt-2 text-base text-text-secondary">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={() => ref.current?.close()}>Cancel</button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => { onConfirm(); ref.current?.close(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
