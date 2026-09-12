const themeColors = [
    { name: "Coral", value: "#e7a08f" },
    { name: "Peach", value: "#f4c7a1" },
    { name: "Sunshine", value: "#e8d49a" },
    { name: "Sage", value: "#b9d4ad" },
    { name: "Sky", value: "#b7d6df" },
    { name: "Lilac", value: "#c9c2d8" },
];

type ColorPaletteProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

export function ColorPalette({ label, value, onChange }: ColorPaletteProps) {
    return <div aria-label={label} className="color-palette" role="radiogroup">{themeColors.map((color) => <button aria-label={color.name} aria-pressed={value === color.value} className={`palette-swatch${value === color.value ? " selected" : ""}`} key={color.value} onClick={() => onChange(color.value)} style={{ backgroundColor: color.value }} title={color.name} type="button" />)}</div>;
}
