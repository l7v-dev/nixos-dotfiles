"use client";

import { useTerminalStore } from "@/store/terminal-store";
import { TERMINAL_THEMES } from "@/lib/terminal-themes";
import { X, Palette, Type, Bell, Eye, Sliders, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TerminalSettingsModal({ isOpen, onClose }: TerminalSettingsModalProps) {
    const { settings, updateSettings } = useTerminalStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-sans p-4">
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        <h2 className="text-base font-semibold text-foreground">
                            Terminal Customization & Preferences
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Theme Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Palette className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                            Color Theme Palette
                        </label>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.values(TERMINAL_THEMES).map((th) => {
                                const isSelected = settings.theme === th.id;
                                return (
                                    <button
                                        key={th.id}
                                        onClick={() => updateSettings({ theme: th.id })}
                                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                            isSelected
                                                ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                                                : "border-border/60 hover:border-border hover:bg-accent/40"
                                        }`}
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                {th.isAdaptive && (
                                                    <Sparkles className="h-3 w-3 text-primary shrink-0" strokeWidth={1.5} />
                                                )}
                                                <span className="text-xs font-medium text-foreground">
                                                    {th.name}
                                                </span>
                                            </div>
                                            {/* Color Swatch Circles */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full border border-black/30"
                                                    style={{ backgroundColor: th.theme.background as string }}
                                                />
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: th.theme.cursor as string }}
                                                />
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: th.theme.blue as string }}
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
                                            {th.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Font & Typography */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Type className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                            Typography & Dimensions
                        </label>

                        {/* Font Size Slider */}
                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Font Size:</span>
                                <span className="font-mono font-semibold text-foreground">
                                    {settings.fontSize}px
                                </span>
                            </div>
                            <input
                                type="range"
                                min={11}
                                max={22}
                                value={settings.fontSize}
                                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                                className="mt-1 w-full accent-primary cursor-pointer"
                            />
                        </div>

                        {/* Font Family */}
                        <div>
                            <span className="text-xs text-muted-foreground">Font Family:</span>
                            <select
                                value={settings.fontFamily}
                                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary font-mono"
                            >
                                <option value="JetBrains Mono, Menlo, Monaco, monospace">
                                    JetBrains Mono (Recommended)
                                </option>
                                <option value="Fira Code, Menlo, Monaco, monospace">
                                    Fira Code (Ligatures Supported)
                                </option>
                                <option value="Cascadia Code, Menlo, Monaco, monospace">
                                    Cascadia Code
                                </option>
                                <option value="Menlo, Monaco, 'Courier New', monospace">
                                    System Monospace
                                </option>
                            </select>
                        </div>
                    </div>

                    {/* Cursor & Behavior */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Eye className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                            Cursor & Rendering
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Cursor Style */}
                            <div>
                                <span className="text-xs text-muted-foreground">Cursor Shape:</span>
                                <select
                                    value={settings.cursorStyle}
                                    onChange={(e) =>
                                        updateSettings({
                                            cursorStyle: e.target.value as "block" | "underline" | "bar",
                                        })
                                    }
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="block">Block (█)</option>
                                    <option value="underline">Underline (_)</option>
                                    <option value="bar">Vertical Bar (|)</option>
                                </select>
                            </div>

                            {/* Cursor Blink */}
                            <div>
                                <span className="text-xs text-muted-foreground">Cursor Blink:</span>
                                <select
                                    value={settings.cursorBlink ? "true" : "false"}
                                    onChange={(e) =>
                                        updateSettings({ cursorBlink: e.target.value === "true" })
                                    }
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="true">Blinking (Active)</option>
                                    <option value="false">Static</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bell & Scrollback */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Bell Style */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Bell className="h-3 w-3" strokeWidth={1.5} />
                                Terminal Bell:
                            </label>
                            <select
                                value={settings.bellStyle}
                                onChange={(e) =>
                                    updateSettings({
                                        bellStyle: e.target.value as "sound" | "visual" | "none",
                                    })
                                }
                                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="visual">Visual Flash (Visual Bell)</option>
                                <option value="sound">Audible</option>
                                <option value="none">Disabled</option>
                            </select>
                        </div>

                        {/* Scrollback */}
                        <div>
                            <span className="text-xs text-muted-foreground">Scrollback Buffer:</span>
                            <select
                                value={settings.scrollback}
                                onChange={(e) =>
                                    updateSettings({ scrollback: Number(e.target.value) })
                                }
                                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary font-mono"
                            >
                                <option value={5000}>5,000 lines</option>
                                <option value={10000}>10,000 lines (Default)</option>
                                <option value={25000}>25,000 lines</option>
                                <option value={50000}>50,000 lines</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end border-t border-border/80 pt-4">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onClose}
                        className="px-5 shadow-sm"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}
