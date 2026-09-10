import { ArrowRight, Gift as GiftIcon } from "lucide-react";
import type { FormEvent } from "react";

type ListSetupProps = {
  listName: string;
  occasion: string;
  mode?: "create" | "edit";
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
          kindlist
        </a>
      </header>
      <section className="auth-layout">
        <div className="auth-intro">
          <span className="eyebrow">Make it yours</span>
          <h1>
            Start with a blank list.
            <br />
            <em>Add only what matters.</em>
          </h1>
          <p>Give your list a name and an occasion. You can shape the categories and wishes after that.</p>
        </div>
        <form className="auth-card" onSubmit={onSubmit}>
          <h2>{mode === "edit" ? "Edit list details" : "Create a new list"}</h2>
          <p>{mode === "edit" ? "Update the name or occasion without changing the gifts on this list." : "Nothing is pre-filled, so this list starts exactly where you want it."}</p>
          <label>
            List name
            <input autoFocus required onChange={(event) => onListNameChange(event.target.value)} placeholder="e.g. Caden's birthday" value={listName} />
          </label>
          <label>
            Occasion <span className="optional-label">optional</span>
            <input onChange={(event) => onOccasionChange(event.target.value)} placeholder="e.g. Birthday, wedding, home" value={occasion} />
          </label>
          <div className="setup-actions">
            {mode === "edit" && onCancel ? <button className="text-button" onClick={onCancel} type="button">Cancel</button> : null}
            <button className="primary-button" type="submit">
              {mode === "edit" ? "Save details" : "Create my list"} <ArrowRight size={17} />
            </button>
          </div>
        </form>
      </section>
      <footer>
        <span>kindlist</span>
        <span>Thoughtful giving, made simple.</span>
      </footer>
    </main>
  );
}
