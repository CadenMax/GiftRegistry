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
    reader.addEventListener("load", () =>
      setNewGift((current) => ({
        ...current,
        imageUrl: String(reader.result ?? ""),
      })),
    );
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
