import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { GiftFilters, Registry } from "../types";

type GiftFilterControlsProps = {
    registry: Registry;
    filters: GiftFilters;
    setFilters: (update: Partial<GiftFilters>) => void;
    claimFilter?: "all" | "available" | "considering" | "claimed";
    setClaimFilter?: (value: "all" | "available" | "considering" | "claimed") => void;
    children?: ReactNode;
};

const sortOptions = [
    ["name-asc", "Gift: A to Z"],
    ["name-desc", "Gift: Z to A"],
    ["price-asc", "Price: low-high"],
    ["price-desc", "Price: high-low"],
    ["category-asc", "Category: A to Z"],
    ["category-desc", "Category: Z to A"],
    ["status-asc", "Status: A to Z"],
    ["status-desc", "Status: Z to A"],
] as const;

function MultiSelectDropdown({ label, selectedIds, options, onChange }: { label: string; selectedIds: string[]; options: Array<{ id: string; name: string }>; onChange: (ids: string[]) => void }) {
    const dropdownRef = useRef<HTMLDetailsElement>(null);
    const summary = selectedIds.length === 0 ? `All ${label.toLowerCase()}` : `${selectedIds.length} selected`;

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (dropdownRef.current?.open && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
                dropdownRef.current.open = false;
            }
        };

        document.addEventListener("click", closeOnOutsideClick);
        return () => document.removeEventListener("click", closeOnOutsideClick);
    }, []);

    return (
        <div className="filter-dropdown-field">
            <span>{label}</span>
            <details className="filter-dropdown" ref={dropdownRef}>
                <summary><span>{summary}</span><ChevronDown size={14} /></summary>
                <div className="filter-dropdown-menu">
                    {options.length === 0 ? <small>No {label.toLowerCase()} yet</small> : options.map((option) => <label key={option.id}><input checked={selectedIds.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selectedIds, option.id] : selectedIds.filter((id) => id !== option.id))} type="checkbox" /> {option.name}</label>)}
                </div>
            </details>
        </div>
    );
}

export function GiftFilterControls({ registry, filters, setFilters, claimFilter, setClaimFilter, children }: GiftFilterControlsProps) {
    const maxGiftPrice = Math.ceil(Math.max(0, ...registry.gifts.map((gift) => gift.price ?? 0)));
    const minPrice = filters.minPrice ?? 0;
    const maxPrice = filters.maxPrice ?? maxGiftPrice;
    const updateMinPrice = (value: number) => setFilters({ minPrice: value <= 0 ? undefined : Math.min(value, maxPrice) });
    const updateMaxPrice = (value: number) => setFilters({ maxPrice: value >= maxGiftPrice ? undefined : Math.max(value, minPrice) });
    const priceScale = maxGiftPrice || 1;
    const minPosition = (minPrice / priceScale) * 100;
    const maxPosition = (maxPrice / priceScale) * 100;
    const minInputWidth = `${Math.max(String(minPrice).length, 1)}ch`;
    const maxInputWidth = `${Math.max(String(maxPrice).length, 1)}ch`;

    return (
        <section className="filter-section">
            <div className="filter-heading"><Search size={16} /><span>Filter and sort</span></div>
            <div className="filter-controls-row">
            <label className="filter-select-field">Sort by<select value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value as GiftFilters["sort"] })}>{sortOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <MultiSelectDropdown label="Categories" options={registry.categories} selectedIds={filters.categoryIds} onChange={(categoryIds) => setFilters({ categoryIds })} />
            <MultiSelectDropdown label="Statuses" options={registry.statuses} selectedIds={filters.statusIds} onChange={(statusIds) => setFilters({ statusIds })} />
            <div className="price-range-field"><span>Price range</span><div className="price-range-control"><div className="price-range-values"><label><span className="sr-only">Minimum price</span><span>$</span><input aria-label="Minimum price" max={maxPrice} min="0" onChange={(event) => updateMinPrice(Number(event.target.value))} style={{ width: minInputWidth }} type="number" value={minPrice} /></label><label><span className="sr-only">Maximum price</span><span>$</span><input aria-label="Maximum price" max={maxGiftPrice} min={minPrice} onChange={(event) => updateMaxPrice(Number(event.target.value))} style={{ width: maxInputWidth }} type="number" value={maxPrice} /></label></div><div className="price-range-sliders"><span aria-hidden="true" className="price-range-fill" style={{ left: `${minPosition}%`, right: `${100 - maxPosition}%` }} /><input aria-label="Minimum price slider" max={maxGiftPrice} min="0" onChange={(event) => updateMinPrice(Number(event.target.value))} type="range" value={minPrice} /><input aria-label="Maximum price slider" max={maxGiftPrice} min="0" onChange={(event) => updateMaxPrice(Number(event.target.value))} type="range" value={maxPrice} /></div></div></div>
            <label className="filter-select-field">Has dependency<select value={filters.dependency} onChange={(event) => setFilters({ dependency: event.target.value as GiftFilters["dependency"] })}><option value="all">Any</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label className="filter-select-field">Is dependent on<select value={filters.dependentOnGiftId} onChange={(event) => setFilters({ dependentOnGiftId: event.target.value })}><option value="">Any gift</option>{registry.gifts.map((gift) => <option key={gift.id} value={gift.id}>{gift.title}</option>)}</select></label>
            {claimFilter && setClaimFilter ? <label className="filter-select-field">Status<select value={claimFilter} onChange={(event) => setClaimFilter(event.target.value as typeof claimFilter)}><option value="all">Everything</option><option value="available">Available</option><option value="considering">Considering</option><option value="claimed">Claimed</option></select></label> : null}
            {children}
            </div>
        </section>
    );
}

export function FilterButtonLabel() {
    return <span className="filter-button-label"><SlidersHorizontal size={15} /> Filters</span>;
}
