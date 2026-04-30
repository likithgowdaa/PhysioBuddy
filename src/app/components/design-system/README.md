# PhysioBuddy Design System

A comprehensive, professional healthcare UI design system for the PhysioBuddy application.

## Design Principles

### 8px Grid System
All spacing follows an 8px grid system for consistency:
- `--spacing-1: 8px`
- `--spacing-2: 16px`
- `--spacing-3: 24px`
- `--spacing-4: 32px`
- `--spacing-5: 40px`
- `--spacing-6: 48px`

### Color Palette

#### Healthcare Colors
- **Primary (Soft Blue)**: Trust & Medical - `#3b82f6`
- **Secondary (Green)**: Health & Correct Posture - `#10b981`
- **Teal Accent**: Modern Healthcare - `#14b8a6`

#### State Colors
- **Success/Correct**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error/Incorrect**: `#ef4444` (Red)

## Components

### Button
Consistent button component with multiple variants and sizes.

**Variants:**
- `primary` - Blue, main action
- `secondary` - Green, secondary action
- `success` - Green with shadow
- `warning` - Orange
- `error` - Red
- `outline` - White with border
- `ghost` - Transparent

**Sizes:**
- `sm` - Small (px-4 py-2)
- `md` - Medium (px-6 py-3)
- `lg` - Large (px-8 py-4)
- `xl` - Extra Large (px-12 py-5)

**Example:**
```tsx
<Button variant="primary" size="lg" icon={<Play />}>
  Start Exercise
</Button>
```

### Card
Flexible card component with multiple visual styles.

**Variants:**
- `default` - White background with border
- `glass` - Glass morphism effect
- `gradient` - Blue to green gradient
- `elevated` - Enhanced shadow on hover

**Padding:**
- `none`, `sm`, `md`, `lg`

**Example:**
```tsx
<Card variant="glass" padding="md">
  Content here
</Card>
```

### Alert
Real-time feedback component with state-based styling.

**Types:**
- `success` - Green for correct posture
- `warning` - Orange for adjustments
- `error` - Red for critical issues
- `info` - Blue for information

**Example:**
```tsx
<Alert type="success" title="Perfect Form!" animated>
  Keep maintaining this position
</Alert>
```

### Input
Enhanced input fields with icons.

**Variants:**
- `default` - Standard input
- `search` - With search icon

**Example:**
```tsx
<Input variant="search" placeholder="Search exercises..." />
```

### StatCard
Statistics display card for metrics.

**Props:**
- `value` - The main value to display
- `label` - Description label
- `icon` - Optional icon
- `variant` - Color variant (default, success, warning, error, primary)

**Example:**
```tsx
<StatCard
  value={92}
  label="Accuracy"
  icon={<Activity />}
  variant="success"
/>
```

## Typography

### Fonts
- **Body**: Inter (400, 500, 600, 700, 800)
- **Headings**: Poppins (500, 600, 700, 800)

### Default Sizes
Defined in theme.css and automatically applied to HTML elements.

## Visual Effects

### Shadows
Multiple shadow levels for depth:
- `shadow-sm` - Subtle
- `shadow` - Default
- `shadow-md` - Medium
- `shadow-lg` - Large
- `shadow-xl` - Extra large
- `shadow-2xl` - Maximum

### Glass Morphism
Used for camera overlays and floating elements:
- Semi-transparent background
- Backdrop blur
- Subtle border

### Animations
- Hover scale effects
- Slide-in animations
- Pulse effects for active states

## Responsive Design

### Breakpoints
- Mobile: Default
- Tablet: `sm:` (640px)
- Desktop: `lg:` (1024px)

### Layout Patterns
- Mobile: Vertical stacking, bottom navigation
- Desktop: Split-screen layouts, sidebar navigation

## State Management

### Exercise Monitoring States
1. `loading` - Camera initializing
2. `positioned` - Body positioning guide
3. `idle` - Ready to start
4. `running` - Exercise in progress
5. `paused` - Exercise paused
6. `completed` - Session finished

### Visual State Indicators
- **Correct Posture**: Green border, green skeleton
- **Incorrect Posture**: Red border, feedback alert
- **Loading**: Animated spinner with pulse
- **Idle**: Blue accent with helper text

## Best Practices

1. **Consistency**: Always use design system components instead of custom elements
2. **8px Grid**: Maintain spacing using the grid system
3. **State Colors**: Use correct colors for state feedback (green=correct, red=incorrect)
4. **Accessibility**: Ensure sufficient color contrast and interactive element sizes
5. **Animation**: Keep animations smooth and purposeful
6. **Responsive**: Test on mobile, tablet, and desktop viewports

## Future Enhancements

- Dark mode support
- Additional component variants
- Animation library integration
- Accessibility improvements (ARIA labels, keyboard navigation)
- Component documentation site
