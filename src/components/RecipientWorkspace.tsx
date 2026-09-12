import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronDown,
    Copy,
    Gift as GiftIcon,
    Link as LinkIcon,
    Pencil,
    Plus,
    Share2,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, CSSProperties, Dispatch, FormEvent, SetStateAction } from "react";
import { GiftFilterControls } from "./GiftFilterControls";
import { DescriptionDialog } from "./DescriptionDialog";
import type { Gift, GiftFilters, RecipientView, Registry } from "../types";

type GiftDraft = Omit<Gift, "id" | "addedAt">;

const themeColors = [
    { name: "Coral", value: "#e7a08f" },
    { name: "Peach", value: "#f4c7a1" },
    { name: "Sunshine", value: "#e8d49a" },
    { name: "Sage", value: "#b9d4ad" },
    { name: "Sky", value: "#b7d6df" },
    { name: "Lilac", value: "#c9c2d8" },
];

type RecipientWorkspaceProps = {
    registry: Registry;
    registries: Registry[];
    hasOwnList: boolean;
    activeRegistryId: string;
    recipientView: RecipientView;
    totalValue: number;
    filters: GiftFilters;
    copied: boolean;
    showAddGift: boolean;
    showListSettings: boolean;
    editingGiftId: string | null;
    newGift: GiftDraft;
    newCategory: string;
    newStatus: string;
    setFilters: (update: Partial<GiftFilters>) => void;
    setNewGift: Dispatch<SetStateAction<GiftDraft>>;
    setEditingGiftId: (value: string | null) => void;
    setShowAddGift: (value: boolean) => void;
    setShowListSettings: Dispatch<SetStateAction<boolean>>;
    setNewCategory: (value: string) => void;
    setNewStatus: (value: string) => void;
    addGift: (event: FormEvent<HTMLFormElement>) => void;
    addCategory: (assignToGift?: boolean) => void;
    addStatus: (assignToGift?: boolean) => void;
    deleteCategory: (categoryId: string) => void;
    deleteStatus: (statusId: string) => void;
    updateCategoryColor: (categoryId: string, color: string) => void;
    updateStatusColor: (statusId: string, color: string) => void;
    editGift: (giftId: string) => void;
    deleteGift: (giftId: string) => void;
    copyCode: () => void;
    handleImageFile: (event: ChangeEvent<HTMLInputElement>) => void;
    normaliseLink: (link: string) => string;
    onSelectList: (registryId: string) => void;
    onNewList: () => void;
    onEditList: () => void;
    onDeleteList: () => void;
    onDuplicateList: () => void;
};

export function RecipientWorkspace({
    registry,
    registries,
    hasOwnList,
    activeRegistryId,
    recipientView,
    totalValue,
    filters,
    copied,
    showAddGift,
    showListSettings,
    editingGiftId,
    newGift,
    newCategory,
    newStatus,
    setFilters,
    setNewGift,
    setEditingGiftId,
    setShowAddGift,
    setShowListSettings,
    setNewCategory,
    setNewStatus,
    addGift,
    addCategory,
    addStatus,
    deleteCategory,
    deleteStatus,
    updateCategoryColor,
    updateStatusColor,
    editGift,
    deleteGift,
    copyCode,
    handleImageFile,
    normaliseLink,
    onSelectList,
    onNewList,
    onEditList,
    onDeleteList,
    onDuplicateList,
}: RecipientWorkspaceProps) {
    if (!hasOwnList) {
        return (
            <section className="workspace recipient-workspace">
                <div className="empty-state no-lists-state">
                    <BookOpen size={24} />
                    <h2>No lists yet</h2>
                    <p>Create your own list whenever you are ready.</p>
                    <button aria-label="Create a list" className="primary-button" onClick={() => onNewList()} type="button"><Plus size={17} /> Create a list</button>
                </div>
            </section>
        );
    }

    return (
        <section className="workspace recipient-workspace">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">{registry.occasion ? registry.occasion : "Gift list"}</span>
                    <h2>{registry.listName}</h2>
                    <p>Add gifts, organize them, and share the list.</p>
                    <div className="list-details-controls">
                        <select aria-label="Choose list" className="list-picker" onChange={(event) => onSelectList(event.target.value)} value={activeRegistryId}>
                            {registries.map((item) => <option key={item.id} value={item.id}>{item.listName}</option>)}
                        </select>
                        <button aria-label="Edit list details" className="icon-button" onClick={onEditList} title="Edit list details" type="button"><Pencil size={15} /></button>
                        <button aria-label="Delete list" className="icon-button" onClick={onDeleteList} title="Delete list" type="button"><Trash2 size={15} /></button>
                        <button aria-label="Duplicate list" className="icon-button" onClick={onDuplicateList} title="Duplicate list" type="button"><Copy size={15} /></button>
                        <button className="text-button" onClick={onNewList} type="button"><Plus size={15} /> New list</button>
                    </div>
                </div>
                <div className="share-compact">
                    <Share2 size={16} />
                    <span>Share</span>
                    <code>{registry.accessCode || "Not set"}</code>
                    <button aria-label="Copy share link" className="copy-button" disabled={!registry.accessCode} onClick={copyCode} title="Copy share link" type="button">
                        {copied ? <Check size={16} /> : <LinkIcon size={16} />}
                    </button>
                </div>
            </div>
            <div className="stats-row">
                <div><strong>{registry.gifts.length}</strong><span>gifts</span></div>
                <div><strong>${totalValue}</strong><span>total</span></div>
                <div><strong>{registry.categories.length}</strong><span>categories</span></div>
            </div>
            <button className="settings-toggle" onClick={() => setShowListSettings((visible) => !visible)} type="button">
                {showListSettings ? "Hide list settings" : "Manage categories and statuses"} <ChevronDown size={16} />
            </button>
            {showListSettings ? (
                <div className="list-settings">
                    <div><span className="eyebrow">List settings</span><h3>Categories and statuses</h3><p>Add labels to keep the list easy to scan.</p></div>
                    <div className="settings-columns">
                        <OptionSettings title="Categories" value={newCategory} placeholder="New category" onChange={setNewCategory} onAdd={() => addCategory(false)} options={registry.categories.map((category) => ({ id: category.id, name: category.name, color: category.color }))} onDelete={deleteCategory} onOptionColorChange={updateCategoryColor} />
                        <OptionSettings title="Statuses" value={newStatus} placeholder="New status" onChange={setNewStatus} onAdd={() => addStatus(false)} options={registry.statuses.map((status) => ({ id: status.id, name: status.name, color: status.color }))} onDelete={deleteStatus} onOptionColorChange={updateStatusColor} />
                    </div>
                </div>
            ) : null}
            {showAddGift ? (
                <GiftForm
                    registry={registry}
                    editingGiftId={editingGiftId}
                    newGift={newGift}
                    newCategory={newCategory}
                    newStatus={newStatus}
                    setNewGift={setNewGift}
                    setShowAddGift={setShowAddGift}
                    setNewCategory={setNewCategory}
                    setNewStatus={setNewStatus}
                    addGift={addGift}
                    addCategory={addCategory}
                    addStatus={addStatus}
                    handleImageFile={handleImageFile}
                />
            ) : null}
            <GiftFilterControls registry={registry} filters={filters} setFilters={setFilters}>
                <button className="primary-button add-gift-button" onClick={() => { setNewGift({ title: "", description: "", imageUrl: "", linkUrl: "", price: undefined, categoryId: "", status: "", dependsOn: [] }); setEditingGiftId(null); setShowAddGift(true); }} type="button"><Plus size={17} /> Add a gift</button>
            </GiftFilterControls>
            {recipientView.gifts.length === 0 ? (
                <div className="empty-state"><GiftIcon size={24} /><h3>No gifts yet</h3><p>Add a gift to get the list started.</p><button className="primary-button" onClick={() => { setNewGift({ title: "", description: "", imageUrl: "", linkUrl: "", price: undefined, categoryId: "", status: "", dependsOn: [] }); setEditingGiftId(null); setShowAddGift(true); }} type="button"><Plus size={17} /> Add a gift</button></div>
            ) : null}
            <div className="gift-grid">{recipientView.gifts.map((gift) => (
                <article className="gift-card" key={gift.id}>
                    {gift.imageUrl ? <img alt={gift.title} className="gift-image" src={gift.imageUrl} /> : <div className="gift-image gift-image-placeholder"><GiftIcon size={24} /><span>No image</span></div>}
                    <div className="gift-copy"><div className="gift-card-toolbar"><span>{gift.status ? <span className="gift-status" style={{ "--tag-color": gift.statusColor } as CSSProperties}>{gift.status}</span> : null}</span><span className="gift-card-actions"><button aria-label={`Edit ${gift.title}`} className="delete-button" onClick={() => editGift(gift.id)} title="Edit gift" type="button"><Pencil size={16} /></button><button aria-label={`Remove ${gift.title}`} className="delete-button" onClick={() => deleteGift(gift.id)} title="Remove gift" type="button"><Trash2 size={16} /></button></span></div><div className="gift-title-row"><div><h3>{gift.title}</h3>{gift.description ? <DescriptionDialog description={gift.description} title={gift.title} /> : null}</div></div>{gift.dependenciesLabel ? <div className="gift-dependency">Needs: {gift.dependenciesLabel}</div> : null}{gift.linkUrl ? <a className="gift-link" href={normaliseLink(gift.linkUrl)} rel="noreferrer" target="_blank">Open link <ArrowRight size={15} /> </a> : null}<div className="gift-footer"><span className="gift-category" style={{ "--tag-color": gift.categoryColor } as CSSProperties}>{gift.categoryName}</span><strong>{gift.priceLabel}</strong></div></div>
                </article>
            ))}</div>
        </section>
    );
}

type Option = { id: string; name: string; color?: string };
function ColorPalette({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return <div aria-label={label} className="color-palette" role="radiogroup">{themeColors.map((color) => <button aria-label={color.name} aria-pressed={value === color.value} className={`palette-swatch${value === color.value ? " selected" : ""}`} key={color.value} onClick={() => onChange(color.value)} style={{ backgroundColor: color.value }} title={color.name} type="button" />)}</div>;
}

function OptionSettings({ title, value, placeholder, onChange, onAdd, options, onDelete, onOptionColorChange }: { title: string; value: string; placeholder: string; onChange: (value: string) => void; onAdd: () => void; options: Option[]; onDelete: (id: string) => void; onOptionColorChange: (id: string, color: string) => void }) {
    return <div className="settings-group"><strong>{title}</strong><div className="settings-add"><input aria-label={placeholder} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} /><button aria-label={`Add ${title.slice(0, -1).toLowerCase()}`} className="small-button" onClick={onAdd} type="button"><Plus size={16} /></button></div>{options.map((option) => <div className="setting-option" key={option.id}><span className="setting-option-name"><span className="option-swatch" style={{ backgroundColor: option.color ?? "#e5c7b8" }} />{option.name}</span><span className="setting-option-actions"><ColorPalette label={`${option.name} color`} value={option.color ?? "#e5c7b8"} onChange={(color) => onOptionColorChange(option.id, color)} /><button aria-label={`Delete ${option.name}`} className="delete-button" onClick={() => onDelete(option.id)} title={`Delete ${title.slice(0, -1).toLowerCase()}`} type="button"><Trash2 size={15} /></button></span></div>)}</div>;
}

function GiftForm({ registry, editingGiftId, newGift, newCategory, newStatus, setNewGift, setShowAddGift, setNewCategory, setNewStatus, addGift, addCategory, addStatus, handleImageFile }: { registry: Registry; editingGiftId: string | null; newGift: GiftDraft; newCategory: string; newStatus: string; setNewGift: Dispatch<SetStateAction<GiftDraft>>; setShowAddGift: (value: boolean) => void; setNewCategory: (value: string) => void; setNewStatus: (value: string) => void; addGift: (event: FormEvent<HTMLFormElement>) => void; addCategory: (assignToGift?: boolean) => void; addStatus: (assignToGift?: boolean) => void; handleImageFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
    const [imageSource, setImageSource] = useState<"link" | "upload">(() => newGift.imageUrl?.startsWith("data:") ? "upload" : "link");
    const saveCategoryOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addCategory(true);
        }
    };
    const saveStatusOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addStatus(true);
        }
    };

        const chooseImageSource = (source: "link" | "upload") => {
            setImageSource(source);
            setNewGift((current) => ({ ...current, imageUrl: "" }));
        };
        return <form className="add-gift-form" onSubmit={addGift}><div className="form-heading"><div><span className="eyebrow">Gift details</span><h3>{editingGiftId ? "Edit gift" : "Add a gift"}</h3></div><button className="text-button" onClick={() => setShowAddGift(false)} type="button">Cancel</button></div><div className="form-grid"><label>Gift name<input autoFocus required onChange={(event) => setNewGift({ ...newGift, title: event.target.value })} placeholder="What are you looking for?" value={newGift.title} /></label><label>Price <span className="optional-label">optional</span><input min="0" onChange={(event) => setNewGift({ ...newGift, price: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="0.00" step="0.01" type="number" value={newGift.price ?? ""} /></label><label className="wide-field">Description <span className="optional-label">optional</span><textarea onChange={(event) => setNewGift({ ...newGift, description: event.target.value })} placeholder="Add a short description." value={newGift.description ?? ""} /></label><label>Category <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, categoryId: event.target.value || undefined })} value={newGift.categoryId ?? ""}><option value="">No category</option>{registry.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="inline-category"><label>New category <span className="optional-label">optional</span><input onChange={(event) => setNewCategory(event.target.value)} onKeyDown={saveCategoryOnEnter} placeholder="e.g. Technology" value={newCategory} /></label><button aria-label="Create category" className="small-button" onClick={() => addCategory(true)} title="Create category" type="button"><Plus size={16} /></button></div><label>Status <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, status: event.target.value || undefined })} value={newGift.status ?? ""}><option value="">No status</option>{registry.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label><div className="inline-status"><label>New status <span className="optional-label">optional</span><input onChange={(event) => setNewStatus(event.target.value)} onKeyDown={saveStatusOnEnter} placeholder="e.g. Still deciding" value={newStatus} /></label><button aria-label="Create status" className="small-button" onClick={() => addStatus(true)} title="Create status" type="button"><Plus size={16} /></button></div><DependencySelector editingGiftId={editingGiftId} gifts={registry.gifts} selectedIds={newGift.dependsOn} onChange={(dependsOn) => setNewGift({ ...newGift, dependsOn })} /><div className="wide-field image-source-field"><span className="field-label">Gift image <span className="optional-label">optional</span></span><div className="image-source-options" role="group" aria-label="Choose gift image source"><button className={imageSource === "link" ? "image-source-option selected" : "image-source-option"} onClick={() => chooseImageSource("link")} type="button">Image link</button><button className={imageSource === "upload" ? "image-source-option selected" : "image-source-option"} onClick={() => chooseImageSource("upload")} type="button">Upload image</button></div>{imageSource === "link" ? <input aria-label="Image link" onChange={(event) => setNewGift({ ...newGift, imageUrl: event.target.value })} placeholder="example.com/image.jpg" type="url" value={newGift.imageUrl?.startsWith("data:") ? "" : newGift.imageUrl ?? ""} /> : <input aria-label="Browse for image" accept="image/*" className="image-file-input" onChange={handleImageFile} type="file" />}</div><label className="wide-field">Item Link <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, linkUrl: event.target.value })} placeholder="amazon.com/green-tshirt" type="text" value={newGift.linkUrl ?? ""} /></label></div><button className="primary-button" type="submit">{editingGiftId ? "Save changes" : "Add to list"} <ArrowRight size={17} /></button></form>;
    return <form className="add-gift-form" onSubmit={addGift}><div className="form-heading"><div><span className="eyebrow">Gift details</span><h3>{editingGiftId ? "Edit gift" : "Add a gift"}</h3></div><button className="text-button" onClick={() => setShowAddGift(false)} type="button">Cancel</button></div><div className="form-grid"><label>Gift name<input autoFocus required onChange={(event) => setNewGift({ ...newGift, title: event.target.value })} placeholder="What are you looking for?" value={newGift.title} /></label><label>Price <span className="optional-label">optional</span><input min="0" onChange={(event) => setNewGift({ ...newGift, price: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="0.00" step="0.01" type="number" value={newGift.price ?? ""} /></label><label className="wide-field">Description <span className="optional-label">optional</span><textarea onChange={(event) => setNewGift({ ...newGift, description: event.target.value })} placeholder="Add a short description." value={newGift.description ?? ""} /></label><label>Category <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, categoryId: event.target.value || undefined })} value={newGift.categoryId ?? ""}><option value="">No category</option>{registry.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="inline-category"><label>New category <span className="optional-label">optional</span><input onChange={(event) => setNewCategory(event.target.value)} onKeyDown={saveCategoryOnEnter} placeholder="e.g. Technology" value={newCategory} /></label><button aria-label="Create category" className="small-button" onClick={() => addCategory(true)} title="Create category" type="button"><Plus size={16} /></button></div><label>Status <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, status: event.target.value || undefined })} value={newGift.status ?? ""}><option value="">No status</option>{registry.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label><div className="inline-status"><label>New status <span className="optional-label">optional</span><input onChange={(event) => setNewStatus(event.target.value)} onKeyDown={saveStatusOnEnter} placeholder="e.g. Still deciding" value={newStatus} /></label><button aria-label="Create status" className="small-button" onClick={() => addStatus(true)} title="Create status" type="button"><Plus size={16} /></button></div><DependencySelector editingGiftId={editingGiftId} gifts={registry.gifts} selectedIds={newGift.dependsOn} onChange={(dependsOn) => setNewGift({ ...newGift, dependsOn })} /><label className="wide-field">Image URL <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, imageUrl: event.target.value })} placeholder="example.com/image.jpg" type="text" value={newGift.imageUrl ?? ""} /></label><label className="wide-field">Upload an image <span className="optional-label">optional</span><input accept="image/*" onChange={handleImageFile} type="file" /></label><label className="wide-field">Item Link <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, linkUrl: event.target.value })} placeholder="amazon.com/green-tshirt" type="text" value={newGift.linkUrl ?? ""} /></label></div><button className="primary-button" type="submit">{editingGiftId ? "Save changes" : "Add to list"} <ArrowRight size={17} /></button></form>;
}

function DependencySelector({ editingGiftId, gifts, selectedIds, onChange }: { editingGiftId: string | null; gifts: Gift[]; selectedIds: string[]; onChange: (dependsOn: string[]) => void }) {
    const selectableGifts = gifts.filter((gift) => gift.id !== editingGiftId);
    return <div className="wide-field dependency-selector"><span className="field-label">Dependency items <span className="optional-label">optional</span></span>{selectableGifts.length ? <div aria-label="Dependency items" className="dependency-options" role="group">{selectableGifts.map((gift) => { const selected = selectedIds.includes(gift.id); return <button aria-pressed={selected} className={`dependency-option${selected ? " selected" : ""}`} key={gift.id} onClick={() => onChange(selected ? selectedIds.filter((id) => id !== gift.id) : [...selectedIds, gift.id])} type="button">{gift.title}{selected ? <Check size={15} /> : null}</button>; })}</div> : <span className="dependency-empty">Add another gift first to create a dependency.</span>}</div>;
}
