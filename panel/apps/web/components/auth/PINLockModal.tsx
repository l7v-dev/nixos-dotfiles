"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, KeyRound, Delete, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/useSecurity";

export function PINLockModal() {
    const { isLocked, pinModalOpen, unlock, setPinModalOpen } = useAuthStore();
    const { login } = useAuth();
    const [pin, setPin] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isOpen = isLocked || pinModalOpen;

    // Reset PIN state when opened
    useEffect(() => {
        if (isOpen) {
            setPin("");
            setErrorMsg(null);
        }
    }, [isOpen]);

    // Handle physical keyboard typing
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= "0" && e.key <= "9") {
                if (pin.length < 6) {
                    setPin((prev) => prev + e.key);
                    setErrorMsg(null);
                }
            } else if (e.key === "Backspace") {
                setPin((prev) => prev.slice(0, -1));
                setErrorMsg(null);
            } else if (e.key === "Enter" && pin.length >= 4) {
                handleSubmit(pin);
            } else if (e.key === "Escape" && !isLocked) {
                setPinModalOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, pin, isLocked]);

    const handleDigit = (d: string) => {
        if (pin.length < 6) {
            const next = pin + d;
            setPin(next);
            setErrorMsg(null);
            if (next.length === 4) {
                handleSubmit(next);
            }
        }
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
        setErrorMsg(null);
    };

    const handleClear = () => {
        setPin("");
        setErrorMsg(null);
    };

    const handleSubmit = (enteredPin: string) => {
        login.mutate(
            { pin: enteredPin },
            {
                onSuccess: (sess) => {
                    unlock(sess.token);
                },
                onError: (err) => {
                    setErrorMsg(err.message || "Hatalı PIN. Lütfen tekrar deneyin.");
                    setPin("");
                },
            }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 text-center">
                {/* Header icon & title */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                        <Lock className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Panel Kilitli</h3>
                        <p className="text-xs text-muted-foreground">Erişmek için PIN kodunuzu girin</p>
                    </div>
                </div>

                {/* PIN dots display */}
                <div className="flex items-center justify-center gap-3 py-1">
                    {[0, 1, 2, 3].map((idx) => (
                        <div
                            key={idx}
                            className={`h-3.5 w-3.5 rounded-full border transition-all duration-200 ${
                                pin.length > idx
                                    ? "bg-primary border-primary scale-110 shadow-xs"
                                    : "border-muted-foreground/30 bg-muted/20"
                            }`}
                        />
                    ))}
                </div>

                {/* Error message */}
                {errorMsg && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-destructive font-medium animate-shake">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                        <button
                            key={digit}
                            onClick={() => handleDigit(digit)}
                            disabled={login.isPending}
                            className="flex h-12 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-base font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs"
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        onClick={handleClear}
                        disabled={login.isPending}
                        className="flex h-12 items-center justify-center rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                        Temizle
                    </button>
                    <button
                        onClick={() => handleDigit("0")}
                        disabled={login.isPending}
                        className="flex h-12 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-base font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={login.isPending}
                        className="flex h-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/40 transition-colors"
                        aria-label="Sil"
                    >
                        <Delete className="h-4 w-4" />
                    </button>
                </div>

                {/* Footer hint */}
                <div className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Varsayılan PIN: 1707</span>
                </div>
            </div>
        </div>
    );
}
