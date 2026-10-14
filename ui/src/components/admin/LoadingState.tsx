export interface LoadingStateProps {
  label: string;
  lines?: number;
}

export function LoadingState({ label, lines = 3 }: LoadingStateProps) {
  return (
    <div className="cedros-admin__loading-state" role="status" aria-label={label} aria-busy="true">
      <span className="cedros-admin__visually-hidden">{label}</span>
      <div className="cedros-admin__loading-skeleton" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
