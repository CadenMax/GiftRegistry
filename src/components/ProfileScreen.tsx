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
type CropRegion = { x: number; y: number; size: number };

const cropCircleSize = 220;

function cropAvatar(source: string, region: CropRegion) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to prepare that profile picture."));
        return;
      }
      context.drawImage(image, region.x, region.y, region.size, region.size, 0, 0, size, size);
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
  const cropStageRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropCircleRef = useRef<HTMLSpanElement>(null);
  const avatarZoomRef = useRef(avatarZoom);

  useEffect(() => {
    avatarZoomRef.current = avatarZoom;
  }, [avatarZoom]);

  const getCropBounds = (zoom: number) => {
    const stage = cropStageRef.current;
    const image = cropImageRef.current;
    if (!stage || !image?.naturalWidth || !image.naturalHeight) return { x: 0, y: 0 };
    const previewScale = Math.max(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight);
    return {
      x: Math.max(0, (image.naturalWidth * previewScale * zoom - cropCircleSize) / 2),
      y: Math.max(0, (image.naturalHeight * previewScale * zoom - cropCircleSize) / 2),
    };
  };

  const clampCropOffset = (offset: CropOffset, zoom: number) => {
    const bounds = getCropBounds(zoom);
    return {
      x: Math.min(bounds.x, Math.max(-bounds.x, offset.x)),
      y: Math.min(bounds.y, Math.max(-bounds.y, offset.y)),
    };
  };

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
      setCropOffset(clampCropOffset({
        x: dragStart.current.offset.x + event.clientX - dragStart.current.pointerX,
        y: dragStart.current.offset.y + event.clientY - dragStart.current.pointerY,
      }, avatarZoomRef.current));
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
    const stage = cropStageRef.current;
    const image = cropImageRef.current;
    const circle = cropCircleRef.current;
    if (!stage || !image || !circle || !image.naturalWidth || !image.naturalHeight) return;
    const stageRect = stage.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const circleRect = circle.getBoundingClientRect();
    const previewScale = Math.max(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight) * avatarZoom;
    const imageCenterX = imageRect.left - stageRect.left + imageRect.width / 2;
    const imageCenterY = imageRect.top - stageRect.top + imageRect.height / 2;
    const circleCenterX = circleRect.left - stageRect.left + circleRect.width / 2;
    const circleCenterY = circleRect.top - stageRect.top + circleRect.height / 2;
    const circleSize = circleRect.width;
    const imageLeft = imageCenterX - image.naturalWidth * previewScale / 2;
    const imageTop = imageCenterY - image.naturalHeight * previewScale / 2;
    const croppedAvatar = await cropAvatar(cropSource, {
      x: (circleCenterX - circleSize / 2 - imageLeft) / previewScale,
      y: (circleCenterY - circleSize / 2 - imageTop) / previewScale,
      size: circleSize / previewScale,
    });
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
          <div className="avatar-crop-stage" onPointerDown={startCropDrag} ref={cropStageRef}>
            <img alt="Crop preview" draggable={false} onDragStart={(event) => event.preventDefault()} ref={cropImageRef} src={cropSource} style={{ left: `calc(50% + ${cropOffset.x}px)`, top: `calc(50% + ${cropOffset.y}px)`, transform: `translate(-50%, -50%) scale(${avatarZoom})` }} />
            <span aria-hidden="true" className="avatar-crop-circle" ref={cropCircleRef} />
          </div>
          <label className="avatar-zoom-control">Zoom
            <input aria-label="Profile picture zoom" max="3" min="1" onChange={(event) => {
              const nextZoom = Number(event.target.value);
              setAvatarZoom(nextZoom);
              setCropOffset((offset) => clampCropOffset(offset, nextZoom));
            }} step="0.1" type="range" value={avatarZoom} />
          </label>
          <div className="avatar-crop-actions"><button className="text-button" onClick={() => setCropOpen(false)} type="button">Cancel</button><button className="primary-button" onClick={() => void confirmCrop()} type="button">Use this photo</button></div>
        </section>
      </div> : null}
    </main>
  );
}
