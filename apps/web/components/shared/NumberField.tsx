import { Input } from "../ui/input";

function NumberField({
    label,
    value,
    onChange,
    suffix,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
}) {
    return (
        <div>
            <label className="text-[11px] font-semibold tracking-widest text-white/40">{label}</label>
            <Input
                type="text"
                inputMode="decimal"
                value={suffix ? `${value}${suffix}` : value}
                onChange={(e) => {
                    const raw = suffix ? e.target.value.replace(suffix, "") : e.target.value;
                    onChange(Number(raw) || 0);
                }}
                className="mt-2 h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
            />
        </div>
    );
}
export default NumberField;