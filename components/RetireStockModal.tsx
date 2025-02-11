"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface RetireStockModalProps {
    isOpen: boolean
    instrumentKey: string
    onClose: () => void
    fetchData: () => void
}

export function RetireStockModal({ isOpen, instrumentKey, onClose, fetchData }: RetireStockModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    

    const [isRetiring, setIsRetiring] = useState(false)

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal()
            document.body.style.overflow = "hidden"
        } else {
            dialogRef.current?.close()
            document.body.style.overflow = "auto"
        }

        // ✅ Cleanup function to restore scrolling when modal closes
        return () => {
            document.body.style.overflow = "auto"
        }
    }, [isOpen])

    const handleRetireStock = async () => {
        setIsRetiring(true)
        try {
            const formattedInstrumentKey = instrumentKey.replace("|", "-");

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            const url = baseUrl + `/api/watchlist/retire-stock?instrumentKey=${encodeURIComponent(formattedInstrumentKey)}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instrumentKey }),
            })

            if (response.ok) {
                onClose() 
                fetchData() // Close modal after success
            } else {
                alert(response.statusText)
            }
        } catch (error) {
            console.error("Error retiring stock:", error)
        } finally {
            setIsRetiring(false)
        }
    }

    // Handle modal open/close
    if (isOpen) {
        dialogRef.current?.showModal()
        document.body.style.overflow = "hidden"
    } else {
        dialogRef.current?.close()
        document.body.style.overflow = "auto"
    }
    

    return (
        <dialog ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center w-full h-full bg-transparent pointer-events-none">
            {/* Fullscreen Blurred Background */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"></div>

            {/* Modal Content */}
            <form className="relative z-10 bg-white p-6 rounded-lg shadow-lg w-[90%] sm:max-w-md pointer-events-auto space-y-6">
                <h2 className="text-lg font-semibold">Confirm Deletion</h2>
                <p className="text-sm text-gray-500">Are you sure you want to remove this stock? This action cannot be undone.</p>

                {/* Buttons */}
                {isRetiring ? (
                    <div className="flex justify-end">
                        <Button type="button" disabled className="flex items-center space-x-2 bg-gray-500 cursor-not-allowed">
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-4 4m8 0l-4-4V4a8 8 0 018 8h-4l4 4m-8 0l4-4"></path>
                            </svg>
                            <span>Removing...</span>
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="button" className="bg-red-500 text-white" onClick={handleRetireStock}>
                            Yes, Remove
                        </Button>
                    </div>
                )}
            </form>
        </dialog>
    )
}
