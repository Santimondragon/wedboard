export function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Invitation Not Found
        </h1>
        <p className="text-zinc-500">
          This invitation link may be invalid or has been removed.
        </p>
      </div>
    </div>
  );
}
