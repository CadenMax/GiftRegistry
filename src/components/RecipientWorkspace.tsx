import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronDown,
    Gift as GiftIcon,
    Link as LinkIcon,
    Plus,
    Search,
    Share2,
    Trash2,
} from "lucide-react";
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import type { Gift, RecipientView, Registry, SortOption } from "../types";

type GiftDraft = Omit<Gift, "id" | "addedAt">;

type RecipientWorkspaceProps = {
    registry: Registry;
    recipientView: RecipientView;
    totalValue: number;
    recipientCategory: string;
    recipientSort: SortOption;
    copied: boolean;
    showAddGift: boolean;
    showListSettings: boolean;
    editingGiftId: string | null;
    newGift: GiftDraft;
    newCategory: string;
    newStatus: string;
    setRecipientCategory: (value: string) => void;
    setRecipientSort: (value: SortOption) => void;
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
    editGift: (giftId: string) => void;
    deleteGift: (giftId: string) => void;
    copyCode: () => void;
    handleImageFile: (event: ChangeEvent<HTMLInputElement>) => void;
    normaliseLink: (link: string) => string;
};

export function RecipientWorkspace({
    registry,
    recipientView,
    totalValue,
    recipientCategory,
    recipientSort,
    copied,
    showAddGift,
    showListSettings,
    editingGiftId,
    newGift,
    newCategory,
    newStatus,
    setRecipientCategory,
    setRecipientSort,
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
    editGift,
    deleteGift,
    copyCode,
    handleImageFile,
    normaliseLink,
}: RecipientWorkspaceProps) {
    return (
        <section className="workspace recipient-workspace">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Your {registry.occasion.toLowerCase()}</span>
                    <h2>{registry.listName}</h2>
                    <p>Start adding gifts you would love to receive.</p>
                </div>
                <button
                    className="primary-button"
                    onClick={() => {
                        setNewGift({
                            title: "",
                            description: "",
                            imageUrl: "",
                            linkUrl: "",
                            price: undefined,
                            categoryId: "",
                            status: "",
                            dependsOn: [],
                            dependencyText: "",
                        });
                        setEditingGiftId(null);
                        setShowAddGift(true);
                    }}
                    type="button"
                >
                    <Plus size={17} /> Add a gift
                </button>
            </div>
            <div className="stats-row">
                <div><strong>{registry.gifts.length}</strong><span>little wishes</span></div>
                <div><strong>${totalValue}</strong><span>all together</span></div>
                <div><strong>{registry.categories.length}</strong><span>categories</span></div>
            </div>
            <div className="share-strip">
                <div className="share-icon"><Share2 size={18} /></div>
                <div><strong>Share your list</strong><p>Friends only need this code to coordinate.</p></div>
                <code>{registry.accessCode}</code>
                <button aria-label="Copy access code" className="copy-button" onClick={copyCode} type="button">
                    {copied ? <Check size={17} /> : <LinkIcon size={17} />}
                </button>
            </div>
            <button className="settings-toggle" onClick={() => setShowListSettings((visible) => !visible)} type="button">
                {showListSettings ? "Hide list settings" : "Manage categories and statuses"} <ChevronDown size={16} />
            </button>
            {showListSettings ? (
                <div className="list-settings">
                    <div><span className="eyebrow">List settings</span><h3>Shape your choices</h3><p>Create reusable categories and statuses, then remove the ones you no longer use.</p></div>
                    <div className="settings-columns">
                        <OptionSettings title="Categories" value={newCategory} placeholder="New category" onChange={setNewCategory} onAdd={() => addCategory(false)} options={registry.categories.map((category) => ({ id: category.id, name: category.name }))} onDelete={deleteCategory} />
                        <OptionSettings title="Statuses" value={newStatus} placeholder="New status" onChange={setNewStatus} onAdd={() => addStatus(false)} options={registry.statuses.map((status) => ({ id: status.id, name: status.name }))} onDelete={deleteStatus} />
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
            <div className="toolbar-row">
                <div className="filter-label"><Search size={16} /><span>Browse wishes</span></div>
                <label>Category<select value={recipientCategory} onChange={(event) => setRecipientCategory(event.target.value)}><option value="all">All categories</option>{recipientView.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Sort by<select value={recipientSort} onChange={(event) => setRecipientSort(event.target.value as SortOption)}><option value="recent">Recently added</option><option value="price">Price</option><option value="name">Name</option></select></label>
            </div>
            <div className="privacy-note"><Check size={16} /><span>Private by design. This view never receives information about who is considering or buying anything.</span></div>
            {recipientView.gifts.length === 0 ? (
                <div className="empty-state"><GiftIcon size={24} /><h3>Your list is ready for its first wish</h3><p>Add a gift to start building your list. You can always edit or remove it later.</p><button className="primary-button" onClick={() => { setNewGift({ title: "", description: "", imageUrl: "", linkUrl: "", price: undefined, categoryId: "", status: "", dependsOn: [], dependencyText: "" }); setEditingGiftId(null); setShowAddGift(true); }} type="button"><Plus size={17} /> Add your first gift</button></div>
            ) : null}
            <div className="gift-grid">{recipientView.gifts.map((gift) => (
                <article className="gift-card" key={gift.id}>
                    {gift.imageUrl ? <img alt={gift.title} className="gift-image" src={gift.imageUrl} /> : <div className="gift-image gift-image-placeholder"><GiftIcon size={24} /><span>No image yet</span></div>}
                    <div className="gift-copy"><div className="gift-title-row"><div>{gift.status ? <span className="gift-status">{gift.status}</span> : null}<h3>{gift.title}</h3><p>{gift.description || "No description added."}</p></div><span className="gift-card-actions"><button aria-label={`Edit ${gift.title}`} className="delete-button" onClick={() => editGift(gift.id)} title="Edit gift" type="button"><BookOpen size={16} /></button><button aria-label={`Remove ${gift.title}`} className="delete-button" onClick={() => deleteGift(gift.id)} title="Remove gift" type="button"><Trash2 size={16} /></button></span></div><div className="gift-footer"><span>{gift.categoryName}</span><strong>{gift.priceLabel}</strong></div>{gift.dependenciesLabel ? <div className="gift-dependency">Needs: {gift.dependenciesLabel}</div> : null}{gift.linkUrl ? <a className="gift-link" href={normaliseLink(gift.linkUrl)} rel="noreferrer" target="_blank">View inspiration <ArrowRight size={15} /></a> : null}</div>
                </article>
            ))}</div>
        </section>
    );
}

type Option = { id: string; name: string };
function OptionSettings({ title, value, placeholder, onChange, onAdd, options, onDelete }: { title: string; value: string; placeholder: string; onChange: (value: string) => void; onAdd: () => void; options: Option[]; onDelete: (id: string) => void }) {
    return <div className="settings-group"><strong>{title}</strong><div className="settings-add"><input aria-label={placeholder} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} /><button aria-label={`Add ${title.slice(0, -1).toLowerCase()}`} className="small-button" onClick={onAdd} type="button"><Plus size={16} /></button></div>{options.map((option) => <div className="setting-option" key={option.id}><span>{option.name}</span><button aria-label={`Delete ${option.name}`} className="delete-button" onClick={() => onDelete(option.id)} title={`Delete ${title.slice(0, -1).toLowerCase()}`} type="button"><Trash2 size={15} /></button></div>)}</div>;
}

function GiftForm({ registry, editingGiftId, newGift, newCategory, newStatus, setNewGift, setShowAddGift, setNewCategory, setNewStatus, addGift, addCategory, addStatus, handleImageFile }: { registry: Registry; editingGiftId: string | null; newGift: GiftDraft; newCategory: string; newStatus: string; setNewGift: Dispatch<SetStateAction<GiftDraft>>; setShowAddGift: (value: boolean) => void; setNewCategory: (value: string) => void; setNewStatus: (value: string) => void; addGift: (event: FormEvent<HTMLFormElement>) => void; addCategory: (assignToGift?: boolean) => void; addStatus: (assignToGift?: boolean) => void; handleImageFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
    return <form className="add-gift-form" onSubmit={addGift}><div className="form-heading"><div><span className="eyebrow">New wish</span><h3>{editingGiftId ? "Edit gift" : "Add something lovely"}</h3></div><button className="text-button" onClick={() => setShowAddGift(false)} type="button">Cancel</button></div><div className="form-grid"><label>Gift name<input autoFocus required onChange={(event) => setNewGift({ ...newGift, title: event.target.value })} placeholder="What would make you smile?" value={newGift.title} /></label><label>Price <span className="optional-label">optional</span><input min="0" onChange={(event) => setNewGift({ ...newGift, price: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="0.00" step="0.01" type="number" value={newGift.price ?? ""} /></label><label className="wide-field">Description <span className="optional-label">optional</span><textarea onChange={(event) => setNewGift({ ...newGift, description: event.target.value })} placeholder="Tell people a little more..." value={newGift.description ?? ""} /></label><label>Category <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, categoryId: event.target.value || undefined })} value={newGift.categoryId ?? ""}><option value="">No category</option>{registry.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="inline-category"><label>New category <span className="optional-label">optional</span><input onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Technology" value={newCategory} /></label><button aria-label="Create category" className="small-button" onClick={() => addCategory(true)} title="Create category" type="button"><Plus size={16} /></button></div><label>Status <span className="optional-label">optional</span><select onChange={(event) => setNewGift({ ...newGift, status: event.target.value || undefined })} value={newGift.status ?? ""}><option value="">No status</option>{registry.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label><div className="inline-status"><label>New status <span className="optional-label">optional</span><input onChange={(event) => setNewStatus(event.target.value)} placeholder="e.g. Still deciding" value={newStatus} /></label><button aria-label="Create status" className="small-button" onClick={() => addStatus(true)} title="Create status" type="button"><Plus size={16} /></button></div><label className="wide-field">Dependency items <span className="optional-label">optional</span><select multiple onChange={(event) => setNewGift({ ...newGift, dependsOn: Array.from(event.target.selectedOptions, (option) => option.value) })} value={newGift.dependsOn}>{registry.gifts.filter((gift) => gift.id !== editingGiftId).map((gift) => <option key={gift.id} value={gift.id}>{gift.title}</option>)}</select></label><label className="wide-field">Custom dependency <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, dependencyText: event.target.value })} placeholder="e.g. Needs access to a USB-C socket" value={newGift.dependencyText ?? ""} /></label><label className="wide-field">Image URL <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, imageUrl: event.target.value })} placeholder="example.com/image.jpg" type="text" value={newGift.imageUrl ?? ""} /></label><label className="wide-field">Upload an image <span className="optional-label">optional</span><input accept="image/*" onChange={handleImageFile} type="file" /></label><label className="wide-field">Link <span className="optional-label">optional</span><input onChange={(event) => setNewGift({ ...newGift, linkUrl: event.target.value })} placeholder="github.com/example/project" type="text" value={newGift.linkUrl ?? ""} /></label></div><button className="primary-button" type="submit">{editingGiftId ? "Save changes" : "Add to my list"} <ArrowRight size={17} /></button></form>;
}
