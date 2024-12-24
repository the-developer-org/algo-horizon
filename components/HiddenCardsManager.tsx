import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface HiddenCardsManagerProps {
  hiddenCards: string[]
  unhideCard: (cardId: string) => void
}

export function HiddenCardsManager({ hiddenCards, unhideCard }: HiddenCardsManagerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Hidden Cards</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hidden Cards</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {hiddenCards.map(cardId => (
            <div key={cardId} className="flex justify-between items-center">
              <span>{cardId}</span>
              <Button onClick={() => unhideCard(cardId)}>Unhide</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

