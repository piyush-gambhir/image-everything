# UI Component Examples

These are **example components** provided as reference implementations. They demonstrate:

- Accessibility best practices (ARIA attributes, keyboard navigation)
- TypeScript patterns (props interfaces, ref forwarding)
- Styling with Tailwind CSS
- Component composition patterns
- Testing approaches

## Important

⚠️ **These are NOT production-ready components for your app.**

They are here as **learning examples** and **starting points**. You should:

1. **Build your own UI components** from scratch based on your design system
2. Use these as **reference** for patterns and best practices
3. Copy and modify them to fit your needs
4. Or use a UI library like shadcn/ui, Radix UI, or Headless UI

## What's Included

- **Button** - Accessible button with variants, sizes, loading state
- **Input** - Form input with label, error handling, helper text
- **Card** - Container component with composable parts

## Usage Examples

### Reference Pattern (Recommended)
Look at the code and implement your own:
```typescript
// Your component inspired by the example
export function MyButton({ children, ...props }: MyButtonProps) {
  // Your implementation
}
```

### Copy & Customize
```bash
cp components/examples/ui/Button.tsx components/YourButton.tsx
# Edit to match your design system
```

### Direct Use (Not Recommended for Production)
```typescript
// Only for prototyping/learning
import { Button } from '@/components/examples/ui/Button';
```

## Why Examples Only?

1. **Your Design System** - Your app needs components that match your specific design
2. **Your Requirements** - You'll need specific features these examples don't have
3. **Bundle Size** - You only want the components and variants you actually use
4. **Flexibility** - Building your own gives you full control

## Recommended Approach

For production apps, consider:

1. **shadcn/ui** - Copy/paste components you can customize
   - https://ui.shadcn.com/

2. **Radix UI** - Unstyled, accessible primitives
   - https://www.radix-ui.com/

3. **Headless UI** - Unstyled components by Tailwind Labs
   - https://headlessui.com/

4. **Build Your Own** - Use these examples as inspiration
   - Full control over every aspect
   - Perfectly matches your design system
   - No unnecessary dependencies

## Testing

See `__tests__/components/Button.test.tsx` for an example of how to test React components with Vitest and Testing Library.

---

**Remember:** These examples show patterns and best practices. Build your own components for production use!
