interface Props {
  message: string;
  action?: string;
  onAction?: () => void;
}

export default function EmptyState({ message, action, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="text-5xl mb-4">📭</span>
      <p className="text-text-secondary text-sm mb-3">{message}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 rounded-full bg-primary text-white text-sm font-medium transition-all duration-200 active:scale-95"
        >
          {action}
        </button>
      )}
    </div>
  );
}
