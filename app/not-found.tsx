import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <EmptyState
        title="Record not found"
        description="The requested item does not exist or is no longer available in this workspace."
      />
    </div>
  );
}
