"use client"

import { useState, useEffect, useRef, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"

interface WatchListModalProps {
    isOpen: boolean
    instrumentKey: string
    onClose: () => void
    fetchHistoricalData: () => void
}

export function WatchListModal({ isOpen, instrumentKey, onClose, fetchHistoricalData }: WatchListModalProps) {
    const [stockSize, setStockSize] = useState("")
    const [entryValue, setEntryValue] = useState("")
    const [optionType, setOptionType] = useState("live")
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
            document.body.style.overflow = "hidden";  // Disable background scroll
        } else {
            dialogRef.current?.close();
            document.body.style.overflow = "auto";  // ✅ Restore scrolling
        }

        return () => {
            document.body.style.overflow = "auto";  // Ensure it's restored when unmounting
        };
    }, [isOpen]);

    useEffect(() => {
        console.log("optionType", optionType)
    }, [optionType])


    // Close modal when clicking outside
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (dialogRef.current && event.target === dialogRef.current) {
                onClose();
            }
        };

        window.addEventListener("click", handleOutsideClick);
        return () => window.removeEventListener("click", handleOutsideClick);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const url = "https://algo-horizon-be.onrender.com/api/watchlist/add-stocks-manually"
            const devUrl = "http://localhost:8080/api/watchlist/add-stocks-manually"

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instrumentKey,
                    isForFuture: optionType === "future",
                    entryValue: Number.parseFloat(entryValue),
                    stockCount: Number.parseInt(stockSize),
                }),
            })

            if (response.ok) {
                await fetchHistoricalData()
                setStockSize("")
                setEntryValue("")
                setOptionType("live")
                onClose()
            } else {
                alert(response.statusText)
                setIsSaving(false)
            }
        } catch (error) {
            console.error("Error adding to watchlist:", error)
            setIsSaving(false)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <dialog ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center w-full h-full bg-transparent pointer-events-none">
            {/* Fullscreen Blurred Background */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"></div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="relative z-10 bg-white p-6 rounded-lg shadow-lg w-[90%] sm:max-w-md pointer-events-auto space-y-6">
                <h2 className="text-lg font-semibold">Add to Watchlist</h2>
                <p className="text-sm text-gray-500">Enter the details to add this stock to your watchlist.</p>

                {/* Stock Size */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stockSize" className="text-right">Stock Size</Label>
                    <Input
                        id="stockSize"
                        type="number"
                        value={stockSize}
                        onChange={(e) => setStockSize(e.target.value)}
                        className="col-span-3 p-2 border rounded-md"
                        required
                    />
                </div>

                {/* Entry Value */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="entryValue" className="text-right">Entry Value</Label>
                    <Input
                        id="entryValue"
                        type="number"
                        step="0.01"
                        value={entryValue}
                        onChange={(e) => setEntryValue(e.target.value)}
                        className="col-span-3 p-2 border rounded-md"
                        required
                    />
                </div>

                {/* Option Type */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Option</Label>
                    <RadioGroup value={optionType} onValueChange={(value) => setOptionType(value)} className="col-span-3 flex space-x-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="live" id="live" />
                            <Label htmlFor="live">Live</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="future" id="future" />
                            <Label htmlFor="future">Future</Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Buttons */}

                {isSaving ? (
                    <div className="flex justify-end">
                        <Button type="button" disabled className="flex items-center space-x-2 bg-gray-500 cursor-not-allowed">
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-4 4m8 0l-4-4V4a8 8 0 018 8h-4l4 4m-8 0l4-4"></path>
                            </svg>
                            <span>Saving...</span>
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Add to Watchlist</Button>
                    </div>
                )}
            </form>
        </dialog>
    )
}
