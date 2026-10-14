import type { ReactNode } from 'react';

export interface SetupNoticeProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}

/**
 * Host setup-notice anatomy: `__body` is the row that pairs the copy block with
 * the CTA. Headline and description must share one text block inside it —
 * placing them as direct `__body` children lays them out side by side.
 */
export function SetupNotice({ title, description, action }: SetupNoticeProps) {
  return (
    <section className="cedros-data-setup-notice">
      <div className="cedros-data-setup-notice__body">
        <div className="cedros-admin__setup-notice-copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {action ? <div className="cedros-data-actions">{action}</div> : null}
      </div>
    </section>
  );
}
