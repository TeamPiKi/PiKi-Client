'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { AlertIconFill, CheckCircledIconFill, WarningIconFill } from '@/assets/icons/fill';

/** 하단 바가 없는 페이지의 기본 토스트 offset */
const TOAST_OFFSET = '52px';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      visibleToasts={1}
      duration={3000}
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CheckCircledIconFill className="size-6 text-icon-success" width={24} height={24} />
        ),
        info: <AlertIconFill className="size-6 text-gray-300" width={24} height={24} />,
        warning: <WarningIconFill className="size-6 text-icon-warning" width={24} height={24} />,
        error: <WarningIconFill className="size-6 text-red-300" width={24} height={24} />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-gray-700)',
          '--normal-text': 'var(--color-text-neutral-inverse)',
          '--border-radius': 'var(--radius-xl)',
          '--width': 'min(440px, calc(100vw - 40px))',
          width: 'min(440px, calc(100vw - 40px))',
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)',
        } as React.CSSProperties
      }
      position="bottom-center"
      offset={{ bottom: TOAST_OFFSET }}
      mobileOffset={{ left: 0, right: 0, bottom: TOAST_OFFSET }}
      toastOptions={{
        classNames: {
          toast: '!border-none',
          title: '!body-2-semibold !opacity-88',
          icon: '!size-6 !ml-0 !mr-0',
          actionButton:
            '!body-2-medium !h-auto !shrink-0 !bg-transparent !p-0 !text-text-neutral-tertiary',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
