import type { Registry } from "../types";

export type ExportField = "listTitle" | "listOwner" | "accessCode" | "occasion" | "itemName" | "price" | "description" | "category" | "status" | "dependencies" | "imageLink";
export type ExportFormat = "txt" | "csv" | "md" | "json";

export const exportFieldLabels: Record<ExportField, string> = {
    listTitle: "List title",
    listOwner: "List owner",
    accessCode: "Access code",
    occasion: "Occasion",
    itemName: "Item name",
    price: "Price",
    description: "Description",
    category: "Category",
    status: "Status",
    dependencies: "Dependency items",
    imageLink: "Gift image (link only)",
};

type ExportData = {
    details: Record<"listTitle" | "listOwner" | "accessCode" | "occasion", string>;
    gifts: Array<Record<"itemName" | "price" | "description" | "category" | "status" | "dependencies" | "imageLink", string>>;
};

type ListExportField = keyof ExportData["details"];
type GiftExportField = keyof ExportData["gifts"][number];

const listFields: ListExportField[] = ["listTitle", "listOwner", "accessCode", "occasion"];
const giftFields: GiftExportField[] = ["itemName", "price", "description", "category", "status", "dependencies", "imageLink"];

function createExportData(registry: Registry): ExportData {
    const categoryNames = new Map(registry.categories.map((category) => [category.id, category.name]));
    const statusNames = new Map(registry.statuses.map((status) => [status.id, status.name]));
    const giftNames = new Map(registry.gifts.map((gift) => [gift.id, gift.title]));

    return {
        details: {
            listTitle: registry.listName,
            listOwner: registry.ownerName,
            accessCode: registry.accessCode,
            occasion: registry.occasion,
        },
        gifts: registry.gifts.map((gift) => ({
            itemName: gift.title,
            price: gift.price === undefined ? "" : gift.price.toFixed(2),
            description: gift.description ?? "",
            category: categoryNames.get(gift.categoryId ?? "") ?? "Uncategorised",
            status: statusNames.get(gift.status ?? "") ?? gift.status ?? "",
            dependencies: gift.dependsOn.map((id) => giftNames.get(id) ?? "Another gift").join(", "),
            imageLink: gift.imageUrl?.startsWith("data:") ? "" : gift.imageUrl ?? "",
        })),
    };
}

function selectedFields(fields: ExportField[]) {
    return {
        list: listFields.filter((field) => fields.includes(field)),
        gifts: giftFields.filter((field) => fields.includes(field)),
    };
}

function selectedData(registry: Registry, fields: ExportField[]) {
    const data = createExportData(registry);
    const selected = selectedFields(fields);
    return {
        details: Object.fromEntries(selected.list.map((field) => [exportFieldLabels[field], data.details[field]])),
        gifts: data.gifts.map((gift) => Object.fromEntries(selected.gifts.map((field) => [exportFieldLabels[field], gift[field]]))),
    };
}

function csvCell(value: string) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
}

function toCsv(registry: Registry, fields: ExportField[]) {
    const data = createExportData(registry);
    const selected = selectedFields(fields);
    const rows: string[][] = [];
    if (selected.list.length > 0) {
        rows.push(["List details"], ["Field", "Value"]);
        selected.list.forEach((field) => rows.push([exportFieldLabels[field], data.details[field]]));
        rows.push([]);
    }
    if (selected.gifts.length > 0) {
        rows.push(["Gifts"], selected.gifts.map((field) => exportFieldLabels[field]));
        data.gifts.forEach((gift) => rows.push(selected.gifts.map((field) => gift[field])));
    }
    return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function toMarkdown(registry: Registry, fields: ExportField[]) {
    const data = createExportData(registry);
    const selected = selectedFields(fields);
    const lines = [`# ${registry.listName}`, ""];
    if (selected.list.length > 0) {
        lines.push("## List details", "", ...selected.list.map((field) => `- **${exportFieldLabels[field]}:** ${data.details[field]}`), "");
    }
    if (selected.gifts.length > 0) {
        lines.push("## Gifts", "", `| ${selected.gifts.map((field) => exportFieldLabels[field]).join(" | ")} |`, `| ${selected.gifts.map(() => "---").join(" | ")} |`);
        data.gifts.forEach((gift) => lines.push(`| ${selected.gifts.map((field) => gift[field].replaceAll("|", "\\|")).join(" | ")} |`));
        lines.push("");
    }
    return lines.join("\n");
}

function toText(registry: Registry, fields: ExportField[]) {
    const data = createExportData(registry);
    const selected = selectedFields(fields);
    const lines = [`${registry.listName}`, "=".repeat(registry.listName.length), ""];
    if (selected.list.length > 0) {
        lines.push("LIST DETAILS", "------------", ...selected.list.map((field) => `${exportFieldLabels[field]}: ${data.details[field]}`), "");
    }
    if (selected.gifts.length > 0) {
        lines.push("GIFTS", "-----", ...data.gifts.map((gift) => selected.gifts.map((field) => `${exportFieldLabels[field]}: ${gift[field]}`).join(" | ")), "");
    }
    return lines.join("\n");
}

export function formatRegistryExport(registry: Registry, fields: ExportField[], format: ExportFormat) {
    if (format === "json") return JSON.stringify(selectedData(registry, fields), null, 2);
    if (format === "csv") return toCsv(registry, fields);
    if (format === "md") return toMarkdown(registry, fields);
    return toText(registry, fields);
}
