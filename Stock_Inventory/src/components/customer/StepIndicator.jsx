export default function StepIndicator({ currentStep = 1, onStepClick }) {
  const steps = [
    { number: '01', title: 'SHIPPING', id: 1 },
    { number: '02', title: 'PAYMENT', id: 2 },
    { number: '03', title: 'DONE', id: 3 },
  ];

  return (
    <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.14em]">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={step.id > currentStep && !isCompleted}
              onClick={() => onStepClick && onStepClick(step.id)}
              className={`flex items-center gap-2 transition-colors ${
                isActive
                  ? 'text-ink'
                  : isCompleted
                  ? 'text-ink/80 hover:text-ink cursor-pointer'
                  : 'text-muted/60 cursor-not-allowed'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-mono ${
                  isActive || isCompleted
                    ? 'bg-ink text-white'
                    : 'border border-line bg-white text-muted'
                }`}
              >
                {isCompleted ? '✓' : step.id}
              </span>
              <span>
                {step.number} {step.title}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <span className="text-line select-none">———</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
