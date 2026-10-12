import { Download, FileDown, X } from "lucide-react";
import { useState } from "react";
import type { Registry } from "../types";
import { exportFieldLabels, formatRegistryExport, type ExportField, type ExportFormat } from "../lib/exportRegistry";

const fields = Object.keys(exportFieldLabels) as ExportField[];
const formatLabels: Record<ExportFormat, string> = {
    txt: "Plain text (.txt)",
    csv: "Spreadsheet (.csv)",
    md: "Markdown (.md)",
    json: "Data backup (.json)",
};

function safeFileName(name: string) {
    return name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "gift-list";
}

type ExportDialogProps = {
    registry: Registry;
    onClose: () => void;
};

export function ExportDialog({ registry, onClose }: ExportDialogProps) {
    const [selectedFields, setSelectedFields] = useState<ExportField[]>(fields);
    const [format, setFormat] = useState<ExportFormat>("txt");
    const allSelected = selectedFields.length === fields.length;

    const toggleField = (field: ExportField) => {
        setSelectedFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
    };

    const download = () => {
        if (selectedFields.length === 0) return;
        const content = formatRegistryExport(registry, selectedFields, format);
        const blob = new Blob([content], { type: format === "json" || format === "csv" ? "text/plain;charset=utf-8" : "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${safeFileName(registry.listName)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose} role="presentation">
            <section aria-labelledby="export-dialog-title" aria-modal="true" className="export-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
                <div className="export-dialog-heading">
                    <div><span className="eyebrow">Take it with you</span><h2 id="export-dialog-title">Export your list</h2></div>
                    <button aria-label="Close export dialog" className="icon-button" onClick={onClose} title="Close" type="button"><X size={17} /></button>
                </div>
                <p className="export-dialog-intro">Choose exactly which list and gift fields to save. Uploaded images are excluded; only image links can be exported.</p>
                <div className="export-section-heading"><strong>Include fields</strong><button className="text-button" onClick={() => setSelectedFields(allSelected ? [] : fields)} type="button">{allSelected ? "Clear all" : "Select all"}</button></div>
                <div className="export-options">
                    {fields.map((field) => <label className="export-option" key={field}><input checked={selectedFields.includes(field)} onChange={() => toggleField(field)} type="checkbox" /><span><strong>{exportFieldLabels[field]}</strong></span></label>)}
                </div>
                <label className="export-format">File format<select onChange={(event) => setFormat(event.target.value as ExportFormat)} value={format}>{(Object.keys(formatLabels) as ExportFormat[]).map((option) => <option key={option} value={option}>{formatLabels[option]}</option>)}</select></label>
                <div className="export-dialog-actions"><button className="text-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" disabled={selectedFields.length === 0} onClick={download} type="button"><Download size={16} /> Download {format.toUpperCase()} <FileDown size={16} /></button></div>
            </section>
        </div>
    );
}
