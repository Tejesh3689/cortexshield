import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AccordionItem = {
  question: string;
  answer: string;
};

interface AccordionProps {
  items: AccordionItem[];
}

export const Accordion: React.FC<AccordionProps> = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = activeIndex === index;
        return (
          <button
            key={item.question}
            type="button"
            onClick={() => setActiveIndex(isOpen ? null : index)}
            className="w-full rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 text-left transition hover:border-white/20"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold text-white">{item.question}</span>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <div className={`mt-4 overflow-hidden transition-all ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-sm leading-7 text-slate-400">{item.answer}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
