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
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-md px-2 text-xs font-medium text-[#FF4F00] hover:bg-orange-50 hover:text-[#c93f00]"
      >
        <CirclePlus className="h-3.5 w-3.5" />
        Insert data
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="min-w-44">
      <p className="px-2 py-1.5 text-xs font-medium text-zinc-500">
        From your trigger
      </p>
      {fields.map((f) => (
        <DropdownMenuItem
          key={f}
          className="cursor-pointer"
          onClick={() => onSelect(`{{${f}}}`)}
        >
          <Badge className="rounded-md bg-orange-100 px-1.5 text-xs font-medium text-[#c93f00] ring-1 ring-orange-200">
            {f}
          </Badge>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
      
    
  );
}
