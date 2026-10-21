import * as DM from '@radix-ui/react-dropdown-menu'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger
export const DropdownMenuGroup = DM.Group
export const DropdownMenuRadioGroup = DM.RadioGroup

export function DropdownMenuContent({ className, children, align = 'end', ...props }: ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn('z-50 min-w-56 rounded-card border border-line bg-surface p-1.5 shadow-pop', className)}
        {...props}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  )
}

const itemClass =
  'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-subtle data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-faint [&_svg]:size-4 [&_svg]:text-ink-muted'

export function DropdownMenuItem({ className, ...props }: ComponentPropsWithoutRef<typeof DM.Item>) {
  return <DM.Item className={cn(itemClass, className)} {...props} />
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentPropsWithoutRef<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem className={cn(itemClass, 'pr-8 relative', className)} {...props}>
      {children}
      <DM.ItemIndicator className="absolute right-2.5 size-1.5 rounded-full bg-primary" />
    </DM.RadioItem>
  )
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-ink-muted">{children}</DM.Label>
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="-mx-1.5 my-1.5 h-px bg-line" />
}
