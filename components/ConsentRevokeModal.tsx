"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface ConsentRevokeModalProps {
  isOpen: boolean
  onClose: () => void
  instrumentKey: string
}

export function ConsentRevokeModal({ isOpen, onClose, instrumentKey }: ConsentRevokeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
      document.body.style.overflow = "hidden"
    } else {
      dialogRef.current?.close()
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dialogRef.current && event.target === dialogRef.current) {
        onClose()
      }
    }

    window.addEventListener("click", handleOutsideClick)
    return () => window.removeEventListener("click", handleOutsideClick)
  }, [onClose])

  const handleYes = async () => {
    try {
        const formattedInstrumentKey = instrumentKey.replace("|", "-");

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        const url = baseUrl + `/api/live-data/remove-stock/${encodeURIComponent(formattedInstrumentKey)}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instrumentKey }),
        })

        if (response.ok) {
            onClose() 
        } else {
            alert(response.statusText)
        }
    } catch (error) {
        console.error("Error retiring stock:", error)
    } finally {
        onClose()
    }
}

  const handleNo = () => {
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full bg-transparent pointer-events-none"
    >
      {/* Blurred Background */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-lg shadow-lg p-6 w-[90%] sm:max-w-sm pointer-events-auto">
        {/* Close (X) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl"
        >
          ×
        </button>

        <h2 className="text-lg font-semibold mb-4">Fetch Live Data?</h2>
        <p className="text-sm text-gray-600 mb-6">
          Do you want to stop fetching live minute data for this stock?
        </p>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={handleNo}>
            No
          </Button>
          <Button onClick={handleYes}>Yes</Button>
        </div>
      </div>
    </dialog>
  )
}
