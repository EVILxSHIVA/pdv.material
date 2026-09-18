"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { getDashboardMetrics } from "@/lib/dataService";
import "@/components/ui/ui.css";
import "./dashboard.css";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(() => getDashboardMetrics());

  useEffect(() => {
    setMetrics(getDashboardMetrics());
  }, []);

  return (
    <Shell>
      {/* 1. Header Greeting & Quick Actions */}
      <div className="dashHeaderSection">
        <div>
          <h1 className="dashGreeting">Operations Control Center</h1>
          <p className="dashGreetingSub">
            Live warehouse stock levels, purchase orders, and site dispatches.
          </p>
        </div>

        <div className="dashQuickActions">
          <Link href="/material-issue" className="dashActionBtn primary">
            <span>↗ Issue Material</span>
          </Link>
          <Link href="/material-consumption" className="dashActionBtn">
            <span>◔ Consumption</span>
          </Link>
          <Link href="/purchases" className="dashActionBtn">
            <span>▣ Purchases / PI</span>
          </Link>
          <Link href="/purchases/new" className="dashActionBtn">
            <span>+ New Purchase</span>
          </Link>
        </div>
      </div>

      {/* 2. Operational KPI Strip - Priority Hierarchy per Section 16 */}
      <div className="dashKpiGrid">
        <div className="dashKpiCard">
          <div className="dashKpiTop">
            <span className="dashKpiLabel">Inventory Value</span>
            <span className="dashKpiIcon">📦</span>
          </div>
          <div className="dashKpiValue">
            ₹ {metrics.totalStockValue > 0 ? (metrics.totalStockValue >= 100000 ? `${(metrics.totalStockValue / 100000).toFixed(2)}L` : metrics.totalStockValue.toLocaleString()) : "0"}
          </div>
          <span className="dashKpiHint">{metrics.totalMaterialsCount} catalog materials</span>
        </div>

        <div className={`dashKpiCard ${metrics.lowStockCount > 0 ? "warningBorder" : ""}`}>
          <div className="dashKpiTop">
            <span className="dashKpiLabel">Low Stock</span>
            <span className="dashKpiIcon">⚠️</span>
          </div>
          <div className={`dashKpiValue ${metrics.lowStockCount > 0 ? "textRed" : ""}`}>
            {metrics.lowStockCount}
          </div>
          <Link href="/inventory?filter=low" className="dashKpiLink">
            Review low stock →
          </Link>
        </div>

        <div className={`dashKpiCard ${metrics.pendingRequestsCount > 0 ? "amberBorder" : ""}`}>
          <div className="dashKpiTop">
            <span className="dashKpiLabel">Pending Requests</span>
            <span className="dashKpiIcon">📋</span>
          </div>
          <div className={`dashKpiValue ${metrics.pendingRequestsCount > 0 ? "textAmber" : ""}`}>
            {metrics.pendingRequestsCount || 0}
          </div>
          <Link href="/material-requests" className="dashKpiLink">
            Review requests →
          </Link>
        </div>

        <div className="dashKpiCard">
          <div className="dashKpiTop">
            <span className="dashKpiLabel">Outstanding</span>
            <span className="dashKpiIcon">⚖</span>
          </div>
          <div className="dashKpiValue">
            ₹ {metrics.totalOutstanding.toLocaleString()}
          </div>
          <span className="dashKpiHint">
            Billed: ₹ {metrics.totalBilled.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. "Needs Attention" List - Urgent Action Items First */}
      {(metrics.lowStockCount > 0 || metrics.pendingRequestsCount > 0 || metrics.pendingPurchasesCount > 0) ? (
        <section className="card attentionCard animate-fade-in">
          <div className="attentionHead">
            <span className="attentionBadge">NEEDS ATTENTION</span>
            <span className="attentionCount">
              {metrics.lowStockCount + (metrics.pendingRequestsCount || 0) + (metrics.pendingPurchasesCount || 0)} items requiring operational action
            </span>
          </div>

          <div className="attentionItemsList">
            {metrics.lowStockCount > 0 && (
              <div className="attentionRow">
                <div className="attentionRowLeft">
                  <span className="attentionDot red" />
                  <div>
                    <strong>{metrics.lowStockCount} materials at low stock</strong>
                    <p className="attentionSub">
                      Stock running low. Purchase replenishment recommended.
                    </p>
                  </div>
                </div>
                <Link href="/inventory?filter=low" className="btn btn-secondary attentionActionBtn">
                  Review Stock
                </Link>
              </div>
            )}

            {metrics.pendingRequestsCount > 0 && (
              <div className="attentionRow">
                <div className="attentionRowLeft">
                  <span className="attentionDot amber" />
                  <div>
                    <strong>{metrics.pendingRequestsCount} site requests waiting for approval</strong>
                    <p className="attentionSub">
                      Field requisitions awaiting supervisor review and warehouse dispatch.
                    </p>
                  </div>
                </div>
                <Link href="/material-requests" className="btn btn-primary attentionActionBtn">
                  Review Requests
                </Link>
              </div>
            )}

            {metrics.pendingPurchasesCount > 0 && (
              <div className="attentionRow">
                <div className="attentionRowLeft">
                  <span className="attentionDot yellow" />
                  <div>
                    <strong>{metrics.pendingPurchasesCount} inward purchases pending</strong>
                    <p className="attentionSub">
                      Vendor shipments awaiting delivery verification and inventory settlement.
                    </p>
                  </div>
                </div>
                <Link href="/purchases" className="btn btn-secondary attentionActionBtn">
                  Review Purchases
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="card attentionCard healthy animate-fade-in" style={{ borderColor: "var(--green-border)", background: "var(--green-bg)" }}>
          <div className="attentionHead" style={{ margin: 0 }}>
            <span className="attentionBadge" style={{ background: "var(--green-border)", color: "var(--green-text)" }}>ALL HEALTHY</span>
            <span style={{ fontSize: "13px", color: "var(--green-text)", fontWeight: 600 }}>
              Zero critical stock shortages, pending approvals, or overdue orders.
            </span>
          </div>
        </section>
      )}

      {/* 4. Material Movement Pipeline */}
      <section className="card movementCard">
        <div className="sectionHead">
          <div>
            <h2>Material Movement Pipeline</h2>
            <p>End-to-end tracked lifecycle of materials through procurement and site consumption</p>
          </div>
        </div>

        <div className="movementPipelineGrid">
          <div className="pipelineStage">
            <span className="pipelineStageName">1. PURCHASED</span>
            <strong className="pipelineVal">{metrics.movement.purchased}</strong>
            <span className="pipelineUnit">Units in Total</span>
          </div>
          <div className="pipelineArrow">→</div>

          <div className="pipelineStage">
            <span className="pipelineStageName">2. DISPATCHED / ISSUED</span>
            <strong className="pipelineVal">{metrics.movement.issued}</strong>
            <span className="pipelineUnit">Units to Sites</span>
          </div>
          <div className="pipelineArrow">→</div>

          <div className="pipelineStage">
            <span className="pipelineStageName">3. CONSUMED AT SITE</span>
            <strong className="pipelineVal">{metrics.movement.consumed}</strong>
            <span className="pipelineUnit">Units Utilized</span>
          </div>
          <div className="pipelineArrow">→</div>

          <div className="pipelineStage highlight">
            <span className="pipelineStageName">4. REMAINING AT SITES</span>
            <strong className="pipelineVal">{metrics.movement.remainingAtSite}</strong>
            <span className="pipelineUnit">Available at Sites</span>
          </div>
        </div>
      </section>

      {/* 5. Split Section: Recent Activity & Quick Navigation */}
      <div className="dashSplitGrid">
        {/* Recent Activity Stream */}
        <section className="card tableCard">
          <div className="sectionHead" style={{ padding: "16px 20px 0" }}>
            <div>
              <h2>Recent Operational Activity</h2>
              <p>Live chronological ledger of dispatches, purchases, and consumptions</p>
            </div>
          </div>

          <div className="activityList">
            {metrics.recentActivity.length === 0 ? (
              <div className="emptyTable">
                <p>No recent activity recorded yet.</p>
                <small>Create a purchase or issue material to see entries here.</small>
              </div>
            ) : (
              metrics.recentActivity.map((act, idx) => (
                <div key={idx} className="activityItem">
                  <div className="activityIcon">{act.icon}</div>
                  <div className="activityInfo">
                    <span className="activityTitle">{act.title}</span>
                    <span className="activitySubtitle">{act.subtitle}</span>
                  </div>
                  <div className="activityRight">
                    <Badge variant={act.badgeType}>{act.badge}</Badge>
                    <span className="activityDate">{act.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Operational Modules Directory */}
        <section className="card">
          <div className="sectionHead">
            <div>
              <h2>Quick Operations Hub</h2>
              <p>Direct shortcuts to core functional modules</p>
            </div>
          </div>

          <div className="opsGrid">
            <Link href="/inventory" className="opsCard">
              <span className="opsIcon">▦</span>
              <div>
                <b>Inventory Master</b>
                <small>Live stock ledger & status</small>
              </div>
            </Link>

            <Link href="/material-issue" className="opsCard">
              <span className="opsIcon">↗</span>
              <div>
                <b>Material Issue</b>
                <small>Dispatch voucher & sites</small>
              </div>
            </Link>

            <Link href="/material-consumption" className="opsCard">
              <span className="opsIcon">◔</span>
              <div>
                <b>Site Consumption</b>
                <small>Record actual usage & balance</small>
              </div>
            </Link>

            <Link href="/party-ledger" className="opsCard">
              <span className="opsIcon">⚖</span>
              <div>
                <b>Party & Site Ledger</b>
                <small>Requisitions & payments</small>
              </div>
            </Link>

            <Link href="/purchases" className="opsCard">
              <span className="opsIcon">▣</span>
              <div>
                <b>Purchases / PI</b>
                <small>Inward orders & bills</small>
              </div>
            </Link>

            <Link href="/reports" className="opsCard">
              <span className="opsIcon">📊</span>
              <div>
                <b>Reports & Cloud Sync</b>
                <small>Spreadsheets & Google sync</small>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
