import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AdminModule } from "@/lib/modules";

function SortableTile({
  module: m,
  index,
  justDragged,
}: {
  module: AdminModule;
  index: number;
  justDragged: React.RefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className="relative h-full touch-manipulation"
      {...attributes}
      {...listeners}
    >
      <Link
        to={m.to}
        draggable={false}
        onClick={(e) => {
          // Soltar depois de arrastar não deve abrir o módulo.
          if (justDragged.current) e.preventDefault();
        }}
        style={{ animationDelay: `${index * 30}ms` }}
        className={`group animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex h-full select-none flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm transition-all duration-200 ${
          isDragging
            ? "scale-105 cursor-grabbing border-primary shadow-2xl ring-2 ring-primary/30"
            : "cursor-pointer border-border hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
        }`}
      >
        <GripVertical className="absolute right-2 top-2 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${m.iconBg} ${m.iconColor}`}
        >
          <m.icon className="h-7 w-7" />
        </span>
        <span className="font-bold">{m.name}</span>
      </Link>
    </div>
  );
}

/**
 * Grade de módulos que pode ser reorganizada arrastando.
 * Mouse: arrasta depois de mover um pouco (clique normal continua abrindo).
 * Toque: segure ~0,25s para começar a arrastar (rolar a tela continua funcionando).
 */
export function ModuleGrid({
  modules,
  onReorder,
}: {
  modules: AdminModule[];
  onReorder: (ids: string[]) => void;
}) {
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = modules.map((m) => m.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {modules.map((m, i) => (
            <SortableTile key={m.id} module={m} index={i} justDragged={justDragged} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
