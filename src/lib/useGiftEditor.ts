import { useState, type ChangeEvent, type FormEvent, type Dispatch, type SetStateAction } from "react";
import type { GiftDraft, Registry } from "../types";
import { blankGift } from "../types";

type UseGiftEditorOptions = {
  registry: Registry;
  setRegistry: Dispatch<SetStateAction<Registry>>;
};

export function normaliseLink(link: string) {
  const trimmedLink = link.trim();
  return trimmedLink && !/^https?:\/\//i.test(trimmedLink)
    ? `https://${trimmedLink}`
    : trimmedLink;
}

export function useGiftEditor({ registry, setRegistry }: UseGiftEditorOptions) {
  const [showAddGift, setShowAddGift] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newGift, setNewGift] = useState<GiftDraft>(blankGift);

  const addGift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGift.title.trim()) return;
    const { dependencyText: _legacyDependencyText, ...giftDraft } = newGift as GiftDraft & { dependencyText?: string };
    setRegistry((current) => ({
      ...current,
      gifts: editingGiftId
        ? current.gifts.map((gift) =>
            gift.id === editingGiftId
              ? {
                  ...gift,
                  ...giftDraft,
                  title: giftDraft.title.trim(),
                  linkUrl: normaliseLink(giftDraft.linkUrl ?? ""),
                }
              : gift,
          )
        : [
            ...current.gifts,
            {
              ...giftDraft,
              id: `gift-${Date.now()}`,
              title: giftDraft.title.trim(),
              linkUrl: normaliseLink(giftDraft.linkUrl ?? ""),
              addedAt: new Date().toISOString(),
            },
          ],
    }));
    setNewGift({ ...blankGift });
    setEditingGiftId(null);
    setShowAddGift(false);
  };

  const editGift = (giftId: string) => {
    const gift = registry.gifts.find((item) => item.id === giftId);
    if (!gift) return;
    setNewGift(gift);
    setEditingGiftId(giftId);
    setShowAddGift(true);
  };

  const deleteGift = (giftId: string) =>
    setRegistry((current) => ({
      ...current,
      gifts: current.gifts.filter((gift) => gift.id !== giftId),
      claims: current.claims.filter((claim) => claim.giftId !== giftId),
    }));

  const handleImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source = new Image();
      source.addEventListener("load", () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
        canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
        setNewGift((current) => ({
          ...current,
          imageUrl: canvas.toDataURL("image/jpeg", 0.82),
        }));
      });
      source.src = String(reader.result ?? "");
    });
    reader.readAsDataURL(file);
  };

  return {
    showAddGift,
    setShowAddGift,
    editingGiftId,
    setEditingGiftId,
    newGift,
    setNewGift,
    addGift,
    editGift,
    deleteGift,
    handleImageFile,
  };
}
