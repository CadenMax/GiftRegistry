import { ArrowRight, Gift as GiftIcon } from "lucide-react";
import type { FormEvent } from "react";

type ListSetupProps = {
  listName: string;
  occasion: string;
  mode?: "create" | "edit" | "duplicate";
  onListNameChange: (value: string) => void;
  onOccasionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
};

export function ListSetup({
  listName,
  occasion,
  mode = "create",
  onListNameChange,
  onOccasionChange,
  onSubmit,
  onCancel,
}: ListSetupProps) {
  return (
    <main className="app-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top">
          <span className="brand-mark"><GiftIcon size={18} /></span>
          HaulBoard
        </a>
      </header>
      <section className="auth-layout">
        <div className="auth-intro">
          <span className="eyebrow">List setup</span>
          <h1>
            Name your list.
            <br />
            <em>Add your gifts.</em>
          </h1>
          <p>Set a name and optional occasion. Add gifts next.</p>
        </div>
        <form className="auth-card" onSubmit={onSubmit}>
          <h2>{mode === "edit" ? "Edit list details" : mode === "duplicate" ? "Duplicate list" : "Create a new list"}</h2>
          <p>{mode === "edit" ? "Change the name or occasion without touching the gifts." : mode === "duplicate" ? "Make a copy with its own name, occasion, and access code." : "Give this list a name to get started."}</p>
          <label>
            List name
            <input autoFocus required onChange={(event) => onListNameChange(event.target.value)} placeholder="e.g. Alex's birthday" value={listName} />
          </label>
          <label>
            Occasion <span className="optional-label">optional</span>
            <input onChange={(event) => onOccasionChange(event.target.value)} placeholder="e.g. Birthday, wedding, home" value={occasion} />
          </label>
          <div className="setup-actions">
            {onCancel ? <button className="text-button" onClick={onCancel} type="button">Cancel</button> : null}
            <button className="primary-button" type="submit">
              {mode === "edit" ? "Save details" : mode === "duplicate" ? "Duplicate list" : "Create list"} <ArrowRight size={17} />
            </button>
          </div>
        </form>
      </section>
      <footer>
        <span>HaulBoard</span>
        <span>Make a list. Share it.</span>
      </footer>
    </main>
  );
}
