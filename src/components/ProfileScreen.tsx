import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent } from "react";
import type { ProfileDetails, RecipientAccount } from "../lib/accountStore";
import { AdminPeople } from "./AdminPeople";

type ProfileScreenProps = {
  account: RecipientAccount;
  onBack: () => void;
  onSignOut: () => void;
  onSave: (details: ProfileDetails) => Promise<void>;
  onDelete: (email: string) => Promise<void>;
};

type CropOffset = { x: number; y: number };

function cropAvatar(source: string, zoom: number, offset: CropOffset) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to prepare that profile picture."));
        return;
      }
      const outputOffset = size / 280;
      context.drawImage(image, (size - image.naturalWidth * scale) / 2 + offset.x * outputOffset, (size - image.naturalHeight * scale) / 2 + offset.y * outputOffset, image.naturalWidth * scale, image.naturalHeight * scale);
      resolve(canvas.toDataURL("image/jpeg", .88));
    };
    image.onerror = () => reject(new Error("Unable to read that profile picture."));
    image.src = source;
  });
}

export function ProfileScreen({ account, onBack, onSignOut, onSave, onDelete }: ProfileScreenProps) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl ?? "");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [cropSource, setCropSource] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropOffset, setCropOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const dragStart = useRef<{ pointerX: number; pointerY: number; offset: CropOffset } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCropSource(String(reader.result ?? ""));
      setAvatarZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    });
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

  const startCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, offset: cropOffset };
  };

  useEffect(() => {
    const moveCrop = (event: globalThis.PointerEvent) => {
      if (!dragStart.current) return;
      event.preventDefault();
      setCropOffset({
        x: dragStart.current.offset.x + event.clientX - dragStart.current.pointerX,
        y: dragStart.current.offset.y + event.clientY - dragStart.current.pointerY,
      });
    };
    const finishCropDrag = () => {
      dragStart.current = null;
    };
    window.addEventListener("pointermove", moveCrop, { passive: false });
    window.addEventListener("pointerup", finishCropDrag);
    window.addEventListener("pointercancel", finishCropDrag);
    return () => {
      window.removeEventListener("pointermove", moveCrop);
      window.removeEventListener("pointerup", finishCropDrag);
      window.removeEventListener("pointercancel", finishCropDrag);
    };
  }, []);

  const confirmCrop = async () => {
    const croppedAvatar = await cropAvatar(cropSource, avatarZoom, cropOffset);
    setAvatarUrl(croppedAvatar);
    setAvatarZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropOpen(false);
  };

  const handleDelete = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await onDelete(deleteEmail);
    } catch (deleteAccountError) {
      setDeleteError(deleteAccountError instanceof Error ? deleteAccountError.message : "Unable to delete your account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top">
          <img alt="" className="brand-mark" src="/favicon.svg" />
          HaulBoard
        </a>
        <button className="text-button" onClick={onBack} type="button">
          <ArrowLeft size={15} /> Back
        </button>
      </header>
      <section className="profile-layout">
        <form className="profile-card profile-form" onSubmit={handleSubmit}>
          <label aria-label="Change profile picture" className="profile-icon profile-avatar-button" title="Change profile picture">
            {avatarUrl ? <img alt="" draggable={false} src={avatarUrl} /> : <UserRound size={28} />}
            <input accept="image/*" onChange={handleAvatarFile} type="file" />
          </label>
          <h1>{name || "Your profile"}</h1>
          <label>
            Name
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            Email address
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
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
          <div className="account-danger-zone">
            <span className="eyebrow">Delete account</span>
            <p>This permanently deletes your account, lists, and account data.</p>
            <div>
              <label>
                Enter your email to confirm
                <input autoComplete="email" onChange={(event) => setDeleteEmail(event.target.value)} type="email" value={deleteEmail} />
              </label>
              {deleteError ? <p className="error-message">{deleteError}</p> : null}
              <button className="danger-button" disabled={deleting || !deleteEmail} onClick={() => void handleDelete()} type="button">{deleting ? "Deleting..." : "Delete account"}</button>
            </div>
          </div>
        </form>
        <AdminPeople />
      </section>
      <footer>
        <span>HaulBoard</span>
        <span>Make a list. Share it.</span>
      </footer>
      {cropOpen ? <div className="avatar-crop-backdrop" role="presentation">
        <section aria-labelledby="avatar-crop-title" aria-modal="true" className="avatar-crop-dialog" role="dialog">
          <div className="avatar-crop-heading"><div><span className="eyebrow">Profile picture</span><h2 id="avatar-crop-title">Position your photo</h2></div><button aria-label="Cancel crop" className="icon-button" onClick={() => setCropOpen(false)} title="Cancel crop" type="button">×</button></div>
          <div className="avatar-crop-stage" onPointerDown={startCropDrag}>
            <img alt="Crop preview" draggable={false} onDragStart={(event) => event.preventDefault()} src={cropSource} style={{ transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${avatarZoom})` }} />
            <span aria-hidden="true" className="avatar-crop-circle" />
          </div>
          <label className="avatar-zoom-control">Zoom
            <input aria-label="Profile picture zoom" max="3" min="1" onChange={(event) => setAvatarZoom(Number(event.target.value))} step="0.1" type="range" value={avatarZoom} />
          </label>
          <div className="avatar-crop-actions"><button className="text-button" onClick={() => setCropOpen(false)} type="button">Cancel</button><button className="primary-button" onClick={() => void confirmCrop()} type="button">Use this photo</button></div>
        </section>
      </div> : null}
    </main>
  );
}
