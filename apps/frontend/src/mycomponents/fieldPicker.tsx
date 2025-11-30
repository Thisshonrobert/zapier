import { useZapStore } from "@/app/store/zapStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CirclePlus } from "lucide-react";


export function FieldPicker({ onSelect }: { onSelect: (value: string) => void }) {
  const triggerData = useZapStore(s => s.tempZapData);

  if (!triggerData) return null;

  const data = triggerData.payload;

  const fields = Object.keys(data); 
  // ["to", "from", "subject", "body"]

  return (
    
      
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon">
        <CirclePlus />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent>
      {fields.map((f) => (
        <DropdownMenuItem key={f}>
          <Badge
            className="bg-orange-500 text-white cursor-pointer"
            onClick={() => onSelect(`{{${f}}}`)}
          >
            {f}
          </Badge>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
      
    
  );
}
