'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { CloseIconFill } from '@/assets/icons/fill';
import { Z_INDEX } from '@/consts/zIndex';
import { cn } from '@/utils/cn';

import Button from '../button';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate bg-bg-layer-overlay duration-100 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0',
        className
      )}
      style={{ zIndex: Z_INDEX.DIALOG, ...props.style }}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeOnDimClick = true,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  /** false 면 딤 클릭으로 닫히지 않음 */
  closeOnDimClick?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={event => {
          onInteractOutside?.(event);
          if (!closeOnDimClick) event.preventDefault();
        }}
        className={cn(
          'fixed top-1/2 left-1/2 flex w-[calc(100%-70px)] max-w-[calc(480px-70px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-white p-4 duration-100 outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
          className
        )}
        style={{ zIndex: Z_INDEX.DIALOG, ...props.style }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose asChild>
            {/** TODO: 수정 필요 */}
            <button type="button" className="absolute top-2 right-2">
              <CloseIconFill />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col', className)} {...props} />;
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-row justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="secondary">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={className} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('*:[a]:underline *:[a]:underline-offset-3', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
