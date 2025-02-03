import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ModelDatesProps {
  model: string
  dates: string[]
  isBelowPar: boolean | undefined
}

export function ModelDates({ model, dates, isBelowPar }: ModelDatesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextDate = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % dates.length)
  }

  const prevDate = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + dates.length) % dates.length)
  }

  return (
    <div
    className={`text-sm p-2 rounded-md bg-white/50 backdrop-blur-sm border-2 ${
      isBelowPar ? "border-green-500" : "border-red-500"
    }`}
  >
    <div className="flex flex-col items-center">
      <span className="font-medium text-blue-700 truncate max-w-[80%] mb-2">{model}</span>
      <div className="flex items-center justify-center w-full space-x-2">
        <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={prevDate}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span
          className={`${isBelowPar ? "text-green-500" : "text-red-500"} font-bold truncate max-w-[60%] text-center`}
        >
          {dates[currentIndex] || "N/A"}
          <span className="ml-2">{isBelowPar === undefined ? "" : isBelowPar ? "DRY" : ""}</span>
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={nextDate}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="text-xs text-gray-500 mt-2 text-center">
      {currentIndex + 1} of {dates.length}
    </div>
  </div>
  )
}

