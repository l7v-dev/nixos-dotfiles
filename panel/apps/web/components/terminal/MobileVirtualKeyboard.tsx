"use client";

interface MobileVirtualKeyboardProps {
    onSendKey: (keyData: string) => void;
}

export function MobileVirtualKeyboard({ onSendKey }: MobileVirtualKeyboardProps) {
    const keys = [
        { label: "ESC", data: "\u001b" },
        { label: "TAB", data: "\t" },
        { label: "CTRL+C", data: "\u0003" },
        { label: "CTRL+D", data: "\u0004" },
        { label: "CTRL+Z", data: "\u001a" },
        { label: "↑", data: "\u001b[A" },
        { label: "↓", data: "\u001b[B" },
        { label: "←", data: "\u001b[D" },
        { label: "→", data: "\u001b[C" },
        { label: "|", data: "|" },
        { label: "~", data: "~" },
        { label: "/", data: "/" },
        { label: "-", data: "-" },
        { label: "ENTER", data: "\r" },
    ];

    return (
        <div className="flex sm:hidden h-9 shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-card px-2 no-scrollbar">
            {keys.map((k) => (
                <button
                    key={k.label}
                    onClick={() => onSendKey(k.data)}
                    className="flex h-6 min-w-[32px] items-center justify-center rounded border border-border/80 bg-background px-2 font-mono text-[11px] font-medium text-foreground active:bg-primary active:text-primary-foreground select-none"
                >
                    {k.label}
                </button>
            ))}
        </div>
    );
}
