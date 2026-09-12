import { Check } from "lucide-react";
import type { Gift } from "../types";

type DependencySelectorProps = {
    editingGiftId: string | null;
    gifts: Gift[];
    selectedIds: string[];
    onChange: (dependsOn: string[]) => void;
};

export function DependencySelector({ editingGiftId, gifts, selectedIds, onChange }: DependencySelectorProps) {
    const selectableGifts = gifts.filter((gift) => gift.id !== editingGiftId);
    return <div className="wide-field dependency-selector"><span className="field-label">Dependency items <span className="optional-label">optional</span></span>{selectableGifts.length ? <div aria-label="Dependency items" className="dependency-options" role="group">{selectableGifts.map((gift) => { const selected = selectedIds.includes(gift.id); return <button aria-pressed={selected} className={`dependency-option${selected ? " selected" : ""}`} key={gift.id} onClick={() => onChange(selected ? selectedIds.filter((id) => id !== gift.id) : [...selectedIds, gift.id])} type="button">{gift.title}{selected ? <Check size={15} /> : null}</button>; })}</div> : <span className="dependency-empty">Add another gift first to create a dependency.</span>}</div>;
}
