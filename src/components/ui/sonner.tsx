import { Toaster as Sonner } from "sonner"
import { toast } from "sonner"
import { type ToasterProps } from "sonner"

// Simple theme hook replacement for next-themes
const useTheme = () => {
  // Default to light theme - this is a simplified version
  return { theme: 'light', resolvedTheme: 'light' };
};

export function Toaster({
  ...props
}: ToasterProps) {
  const { theme = "system" } = props
  const { resolvedTheme } = useTheme()
  const themeValue = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <Sonner
      theme={themeValue as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { toast }
