import AdminWordQueue from './AdminWordQueue';

const CONFIRM_TEXT = {
  approved: (w) =>
    `Approve removing "${w}"? This will delete it from the words list.`,
  denied: (w) =>
    `Deny removing "${w}"? It will stay in (or be restored to) the words list.`,
};

export default function AdminWordRemovals({ onPendingCountChange } = {}) {
  return (
    <AdminWordQueue
      endpoint="/api/admin/word-removals"
      listKey="removals"
      title="Word removals"
      submittedByLabel="Flagged by"
      emptyText="No words flagged yet."
      confirmText={CONFIRM_TEXT}
      onPendingCountChange={onPendingCountChange}
    />
  );
}
