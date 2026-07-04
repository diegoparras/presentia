"use client";
import React from 'react'
import { useI18n } from '@/lib/i18n'

interface StepIndicatorProps {
  currentStep: number
}

const steps = [
  { step: 1, labelKey: 'lib.themes.stepBrand' },
  { step: 2, labelKey: 'lib.themes.palette' },
  { step: 3, labelKey: 'lib.themes.stepFonts' },
  { step: 4, labelKey: 'lib.themes.logo' },
]

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-7 px-4 min-w-[104px] pt-8 border-r border-[#EDEEEF]">
      {steps.map(({ step, labelKey }) => {
        const isActive = currentStep === step
        return (
          <div key={step} className="flex flex-col items-center gap-1.5 px-3  ">
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${isActive
                ? 'bg-[#e25a4e] text-white'
                : 'bg-white text-[#404348] border border-[#EDEEEF]'
                }`}
            >
              {t('lib.themes.step', { step })}
            </span>
            <span className="text-[11px] font-normal text-black">{t(labelKey)}</span>
          </div>
        )
      })}
    </div>
  )
}
