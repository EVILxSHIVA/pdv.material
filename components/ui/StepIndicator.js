"use client";

import "./step-indicator.css";

export default function StepIndicator({ steps = [], currentStep = 1, onStepClick }) {
  return (
    <div className="stepperWrapper">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isClickable = onStepClick && stepNum <= currentStep;

        return (
          <div
            key={step.title || idx}
            className={`stepItem ${isCompleted ? "completed" : ""} ${
              isCurrent ? "current" : ""
            } ${isClickable ? "clickable" : ""}`}
            onClick={() => isClickable && onStepClick(stepNum)}
          >
            <div className="stepBadge">
              {isCompleted ? "✓" : stepNum}
            </div>
            <div className="stepMeta">
              <span className="stepNumLabel">Step {stepNum}</span>
              <span className="stepTitle">{step.title}</span>
            </div>
            {idx < steps.length - 1 && <div className="stepConnector" />}
          </div>
        );
      })}
    </div>
  );
}
