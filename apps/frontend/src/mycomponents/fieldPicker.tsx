import { useZapStore } from "@/app/store/zapStore";


export function FieldPicker({ onSelect }: { onSelect: (value: string) => void }) {
  const triggerData = useZapStore(s => s.tempZapData);

  if (!triggerData) return <p>No trigger data found</p>;

  const data = triggerData.payload;

  const fields = Object.keys(data); 
  // ["to", "from", "subject", "body"]

  return (
    <div className="flex gap-2">
      {fields.map(f => (
        <button
          key={f}
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
          onClick={() =>onSelect(`{{${f}}}`)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
