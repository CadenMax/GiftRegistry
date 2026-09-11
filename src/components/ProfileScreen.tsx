import { ArrowLeft, Gift as GiftIcon, ImagePlus, LogOut, UserRound } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ProfileDetails, RecipientAccount } from "../lib/accountStore";
import { AdminPeople } from "./AdminPeople";

type ProfileScreenProps = {
  account: RecipientAccount;
  listCount: number;
  onBack: () => void;
  onSignOut: () => void;
  onSave: (details: ProfileDetails) => Promise<void>;
};

export function ProfileScreen({ account, listCount, onBack, onSignOut, onSave }: ProfileScreenProps) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setAvatarUrl(String(reader.result ?? "")));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await onSave({ name, email, avatarUrl, currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top">
          <span className="brand-mark"><GiftIcon size={18} /></span>
          HaulBoard
        </a>
        <button className="text-button" onClick={onBack} type="button">
          <ArrowLeft size={15} /> Back
        </button>
      </header>
      <section className="profile-layout">
        <form className="profile-card profile-form" onSubmit={handleSubmit}>
          <div className="profile-icon">
            {avatarUrl ? <img alt="" src={avatarUrl} /> : <UserRound size={28} />}
          </div>
          <label className="avatar-upload">
            <ImagePlus size={15} /> Change avatar
            <input accept="image/*" onChange={handleAvatarFile} type="file" />
          </label>
          <span className="eyebrow">Account</span>
          <h1>{name || "Your profile"}</h1>
          <label>
            Name
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            Email address
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <div className="profile-stat"><strong>{listCount}</strong><span>{listCount === 1 ? "list" : "lists"}</span></div>
          <div className="profile-password-heading"><span className="eyebrow">Change password</span><small>Leave blank to keep your current password.</small></div>
          <label>
            Current password
            <input onChange={(event) => setCurrentPassword(event.target.value)} type="password" value={currentPassword} />
          </label>
          <label>
            New password
            <input minLength={8} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
          </label>
          {error ? <p className="error-message">{error}</p> : null}
          {saved ? <p className="profile-success">Saved.</p> : null}
          <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving..." : "Save profile"}</button>
          <button className="secondary-button profile-logout" onClick={onSignOut} type="button"><LogOut size={16} /> Log out</button>
        </form>
        <AdminPeople />
      </section>
      <footer>
        <span>HaulBoard</span>
        <span>Make a list. Share it.</span>
      </footer>
    </main>
  );
}
