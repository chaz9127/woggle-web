import AdminWordQueue from './AdminWordQueue';

const CONFIRM_TEXT = {
  approved: (w) => `Approve "${w}"? This will add it to the words list.`,
  denied: (w) =>
    `Deny "${w}"? This will remove it from the words list if present.`,
};

export default function AdminWordSuggestions({ onPendingCountChange } = {}) {
  return (
    <AdminWordQueue
      endpoint="/api/admin/word-suggestions"
      listKey="suggestions"
      title="Word suggestions"
      submittedByLabel="Submitted by"
      emptyText="No suggestions yet."
      confirmText={CONFIRM_TEXT}
      onPendingCountChange={onPendingCountChange}
    />
  );
}
