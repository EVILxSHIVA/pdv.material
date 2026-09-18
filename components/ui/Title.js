"use client";

export function Title({ title, desc, action, badge }) {
  return (
    <div className="pageHeaderSection">
      <div className="pageHeaderLeft">
        <div className="pageTitleRow">
          <h1>{title}</h1>
          {badge}
        </div>
        {desc && <p className="pageHeaderDesc">{desc}</p>}
      </div>
      {action && <div className="pageHeaderActions">{action}</div>}
    </div>
  );
}
