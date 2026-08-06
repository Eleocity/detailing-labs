import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  MapPin,
  Car,
  Loader2,
  GripVertical,
  Calendar,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { format, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

// ── Types ─────────────────────────────────────────────────────────────────────

type Booking = {
  id: number;
  bookingNumber: string;
  customerFirstName: string;
  customerLastName: string;
  appointmentDate: string;
  appointmentEndTime?: string | null;
  serviceAddress?: string | null;
  serviceCity?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  packageName?: string | null;
  status: string;
  duration?: number | null;
};

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
};

// ── Status badge colors ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  assigned: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  en_route: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  completed: "bg-green-500/15 text-green-400 border-green-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// ── BookingCard ───────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  isDragOverlay = false,
}: {
  booking: Booking;
  isDragOverlay?: boolean;
}) {
  const statusClass =
    STATUS_COLORS[booking.status] ??
    "bg-muted text-muted-foreground border-border";

  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground p-3 flex gap-2 w-full ${
        isDragOverlay
          ? "opacity-90 shadow-2xl ring-2 ring-primary/40"
          : "shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <div className="flex items-start pt-0.5 text-muted-foreground/40 flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Customer + booking number */}
        <div>
          <p className="text-sm font-semibold leading-none truncate">
            {booking.customerFirstName} {booking.customerLastName}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            #{booking.bookingNumber}
          </p>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{format(new Date(booking.appointmentDate), "h:mm a")}</span>
        </div>

        {/* Vehicle */}
        {(booking.vehicleMake || booking.vehicleModel) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Car className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {[booking.vehicleMake, booking.vehicleModel]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        )}

        {/* Package */}
        {booking.packageName && (
          <p className="text-[11px] text-muted-foreground truncate">
            {booking.packageName}
          </p>
        )}

        {/* Address */}
        {booking.serviceAddress && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{booking.serviceAddress}</span>
          </div>
        )}

        {/* Status badge */}
        <div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusClass}`}
          >
            {statusLabel(booking.status)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── DraggableBookingCard ──────────────────────────────────────────────────────

function DraggableBookingCard({
  booking,
  currentEmployeeId,
}: {
  booking: Booking;
  currentEmployeeId: number | "unassigned";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
    data: { bookingId: booking.id, currentEmployeeId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing touch-none transition-opacity ${
        isDragging ? "opacity-30" : "opacity-100"
      }`}
    >
      <BookingCard booking={booking} />
    </div>
  );
}

// ── DroppableColumn ───────────────────────────────────────────────────────────

function DroppableColumn({
  columnId,
  label,
  avatarText,
  avatarColor,
  bookings,
  isOver: externalIsOver,
}: {
  columnId: number | "unassigned";
  label: string;
  avatarText: string;
  avatarColor: string;
  bookings: Booking[];
  isOver?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const over = isOver || externalIsOver;

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[300px] flex-shrink-0"
      style={{ width: 288 }}
    >
      {/* Sticky column header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${avatarColor}`}
          >
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-none">
              {label}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
          >
            {bookings.length}
          </Badge>
        </div>
        <div className="mt-2 h-px bg-border" />
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 mt-2 min-h-[120px] rounded-xl transition-colors duration-150 p-1 space-y-2 ${
          over
            ? "bg-primary/8 ring-2 ring-primary/30 ring-inset"
            : "bg-transparent"
        }`}
      >
        {bookings.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            No bookings
          </div>
        ) : (
          bookings.map(b => (
            <DraggableBookingCard
              key={b.id}
              booking={b}
              currentEmployeeId={columnId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── AdminScheduleBoard ────────────────────────────────────────────────────────

export default function AdminScheduleBoard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);

  // Date range: full selected day
  const dateFrom = new Date(selectedDate);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(selectedDate);
  dateTo.setHours(23, 59, 59, 999);

  // Queries
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = trpc.bookings.list.useQuery({
    limit: 100,
    offset: 0,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  });

  const { data: employeesData, isLoading: employeesLoading } =
    trpc.employees.list.useQuery();

  const assignEmployee = trpc.bookings.assignEmployee.useMutation({
    onSuccess: () => {
      toast.success("Booking reassigned");
      refetchBookings();
    },
    onError: err => {
      toast.error(`Failed to assign: ${err.message}`);
    },
  });

  const bookings: Booking[] = bookingsData?.bookings ?? [];
  const allEmployees: Employee[] = employeesData ?? [];
  const activeEmployees = allEmployees.filter(e => e.status === "active");

  const isLoading = bookingsLoading || employeesLoading;

  // For the drag overlay
  const activeBooking = activeBookingId
    ? (bookings.find(b => b.id === activeBookingId) ?? null)
    : null;

  // ── Assign bookings to columns ─────────────────────────────────────────────
  // "Unassigned" = bookings whose status is "new" or "confirmed" (no employee assigned)
  // We don't have assignment data surfaced directly on the booking list object,
  // so we track local overrides from drag-and-drop operations.
  const [localAssignments, setLocalAssignments] = useState<
    Record<number, number | "unassigned">
  >({});

  function getEffectiveColumn(booking: Booking): number | "unassigned" {
    if (localAssignments[booking.id] !== undefined) {
      return localAssignments[booking.id];
    }
    // Treat "assigned", "en_route", "in_progress" as potentially assigned —
    // but without a real FK we default all to unassigned unless locally moved.
    return "unassigned";
  }

  const bookingsByColumn: Record<string | number, Booking[]> = {
    unassigned: [],
  };
  activeEmployees.forEach(emp => {
    bookingsByColumn[emp.id] = [];
  });
  bookings.forEach(b => {
    const col = getEffectiveColumn(b);
    if (col === "unassigned" || !bookingsByColumn[col]) {
      bookingsByColumn["unassigned"].push(b);
    } else {
      bookingsByColumn[col].push(b);
    }
  });

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveBookingId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBookingId(null);
    const { active, over } = event;
    if (!over) return;

    const bookingId = Number(active.id);
    const targetColumnId = over.id as number | "unassigned";
    const currentColumnId = (
      active.data.current as { currentEmployeeId: number | "unassigned" }
    ).currentEmployeeId;

    if (targetColumnId === currentColumnId) return;

    // Optimistically update local state
    setLocalAssignments(prev => ({ ...prev, [bookingId]: targetColumnId }));

    if (targetColumnId === "unassigned") {
      // No mutation needed for unassign in this schema — just local update
      toast.info("Booking moved to Unassigned");
      return;
    }

    assignEmployee.mutate({
      bookingId,
      employeeId: targetColumnId as number,
      isPrimary: true,
    });
  }

  // ── Column avatar colors (cycle through a palette) ─────────────────────────
  const AVATAR_COLORS = [
    "bg-violet-500/20 text-violet-300",
    "bg-sky-500/20 text-sky-300",
    "bg-emerald-500/20 text-emerald-300",
    "bg-amber-500/20 text-amber-300",
    "bg-pink-500/20 text-pink-300",
    "bg-teal-500/20 text-teal-300",
    "bg-orange-500/20 text-orange-300",
    "bg-indigo-500/20 text-indigo-300",
  ];

  const dateLabel = isToday(selectedDate)
    ? `Today — ${format(selectedDate, "EEEE, MMMM d, yyyy")}`
    : format(selectedDate, "EEEE, MMMM d, yyyy");

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-bold">Schedule Board</h1>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={() => setSelectedDate(d => subDays(d, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm font-semibold min-w-[220px] text-center">
              {dateLabel}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedDate(new Date())}
              disabled={isToday(selectedDate)}
            >
              Today
            </Button>
          </div>
        </div>

        {/* ── Board content ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <div className="flex flex-row gap-4 p-4 sm:p-6 min-h-full w-max">
                {/* Unassigned column */}
                <DroppableColumn
                  columnId="unassigned"
                  label="Unassigned"
                  avatarText="?"
                  avatarColor="bg-muted text-muted-foreground"
                  bookings={bookingsByColumn["unassigned"] ?? []}
                />

                {/* Separator */}
                <div className="w-px bg-border self-stretch flex-shrink-0" />

                {/* Employee columns */}
                {activeEmployees.length === 0 ? (
                  <div className="flex items-center justify-center min-w-[200px] text-sm text-muted-foreground/60">
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No active employees</p>
                    </div>
                  </div>
                ) : (
                  activeEmployees.map((emp, index) => (
                    <DroppableColumn
                      key={emp.id}
                      columnId={emp.id}
                      label={`${emp.firstName} ${emp.lastName}`}
                      avatarText={initials(emp.firstName, emp.lastName)}
                      avatarColor={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                      bookings={bookingsByColumn[emp.id] ?? []}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay dropAnimation={null}>
              {activeBooking ? (
                <div className="w-[280px]">
                  <BookingCard booking={activeBooking} isDragOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </AdminLayout>
  );
}
