# Precedence Brand Guide
## Complete Brand Identity System

---

## Logo

### Primary Logo (Logo_10)
The Precedence logo combines a judge's gavel with an upward trending market chart, forming a checkmark within a circular ring. The symbol represents legal authority meeting prediction markets with verified outcomes.

**Logo Variations:**
- **Full Color** - Primary use on light backgrounds
- **Monochrome Dark** - Navy blue (#0A1F44) on light backgrounds
- **Monochrome Light** - White on dark backgrounds
- **Icon Only** - For app icons, favicons, social media profiles

**Clear Space:**
Maintain clear space around the logo equal to the height of the circle ring on all sides.

**Minimum Size:**
- Digital: 24px height
- Print: 0.5 inches height

**Don'ts:**
- ❌ Don't rotate the logo
- ❌ Don't change the colors
- ❌ Don't add effects (shadows, gradients beyond the original)
- ❌ Don't place on busy backgrounds without a solid backing
- ❌ Don't stretch or distort proportions

---

## Color Palette

### Primary Colors

**Royal Blue**
- HEX: `#0052FF`
- RGB: `0, 82, 255`
- CMYK: `100, 68, 0, 0`
- Use: Primary brand color, main CTAs, headlines

**Deep Purple**
- HEX: `#6366F1`
- RGB: `99, 102, 241`
- CMYK: `59, 58, 0, 5`
- Use: Secondary brand color, accents, gradients

**Gold Accent**
- HEX: `#FBBF24`
- RGB: `251, 191, 36`
- CMYK: `0, 24, 86, 2`
- Use: Highlights, winning positions, CTAs, premium features

### Secondary Colors

**Charcoal**
- HEX: `#18181B`
- RGB: `24, 24, 27`
- CMYK: `11, 11, 0, 89`
- Use: Body text, dark UI elements

**Slate Gray**
- HEX: `#64748B`
- RGB: `100, 116, 139`
- CMYK: `28, 17, 0, 45`
- Use: Secondary text, borders, disabled states

**Light Gray**
- HEX: `#F1F5F9`
- RGB: `241, 245, 249`
- CMYK: `3, 2, 0, 2`
- Use: Backgrounds, cards, subtle dividers

**Off-White**
- HEX: `#FAFAFA`
- RGB: `250, 250, 250`
- CMYK: `0, 0, 0, 2`
- Use: Page backgrounds, light mode

### Gradient System

**Primary Gradient**
```css
background: linear-gradient(135deg, #0052FF 0%, #6366F1 100%);
```
Use: Hero sections, primary buttons, premium features

**Accent Gradient**
```css
background: linear-gradient(135deg, #6366F1 0%, #FBBF24 100%);
```
Use: Highlights, winning states, special promotions

**Dark Gradient**
```css
background: linear-gradient(135deg, #18181B 0%, #0A1F44 100%);
```
Use: Dark mode backgrounds, footer sections

### Semantic Colors

**Success Green**
- HEX: `#10B981`
- Use: Winning positions, successful trades, confirmations

**Error Red**
- HEX: `#EF4444`
- Use: Losing positions, errors, warnings

**Warning Orange**
- HEX: `#F59E0B`
- Use: Pending states, cautions, important notices

**Info Blue**
- HEX: `#3B82F6`
- Use: Information, neutral notifications, tips

---

## Typography

### Primary Typeface: **Inter**

**Headings:**
- Font: Inter
- Weights: 700 (Bold), 600 (Semibold)
- Use: All headlines, titles, section headers

**Body Text:**
- Font: Inter
- Weights: 400 (Regular), 500 (Medium)
- Use: Paragraphs, descriptions, UI text

**Monospace (for data/numbers):**
- Font: JetBrains Mono or SF Mono
- Weight: 500 (Medium)
- Use: Price displays, odds, statistics, wallet addresses

### Type Scale

```
H1: 48px / 3rem - Bold (700) - Line height: 1.2
H2: 36px / 2.25rem - Bold (700) - Line height: 1.3
H3: 30px / 1.875rem - Semibold (600) - Line height: 1.3
H4: 24px / 1.5rem - Semibold (600) - Line height: 1.4
H5: 20px / 1.25rem - Semibold (600) - Line height: 1.4
H6: 18px / 1.125rem - Semibold (600) - Line height: 1.5

Body Large: 18px / 1.125rem - Regular (400) - Line height: 1.6
Body: 16px / 1rem - Regular (400) - Line height: 1.6
Body Small: 14px / 0.875rem - Regular (400) - Line height: 1.6
Caption: 12px / 0.75rem - Medium (500) - Line height: 1.5
```

### Web Fonts Implementation

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Spacing System

Use 8px base unit for consistent spacing:

```
4px   - 0.25rem - xxs
8px   - 0.5rem  - xs
12px  - 0.75rem - sm
16px  - 1rem    - md
24px  - 1.5rem  - lg
32px  - 2rem    - xl
48px  - 3rem    - 2xl
64px  - 4rem    - 3xl
96px  - 6rem    - 4xl
128px - 8rem    - 5xl
```

---

## UI Components

### Buttons

**Primary Button**
```css
background: linear-gradient(135deg, #0052FF 0%, #6366F1 100%);
color: #FFFFFF;
border-radius: 8px;
padding: 12px 24px;
font-weight: 600;
font-size: 16px;
transition: transform 0.2s, box-shadow 0.2s;
```

Hover: `transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 82, 255, 0.3);`

**Secondary Button**
```css
background: transparent;
color: #0052FF;
border: 2px solid #0052FF;
border-radius: 8px;
padding: 10px 22px;
font-weight: 600;
font-size: 16px;
```

Hover: `background: rgba(0, 82, 255, 0.05);`

**Ghost Button**
```css
background: transparent;
color: #64748B;
border: none;
padding: 12px 24px;
font-weight: 500;
font-size: 16px;
```

Hover: `color: #0052FF;`

### Cards

```css
background: #FFFFFF;
border-radius: 12px;
border: 1px solid #F1F5F9;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
transition: box-shadow 0.3s, transform 0.3s;
```

Hover: `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); transform: translateY(-4px);`

### Inputs

```css
background: #FFFFFF;
border: 2px solid #E2E8F0;
border-radius: 8px;
padding: 12px 16px;
font-size: 16px;
color: #18181B;
transition: border-color 0.2s;
```

Focus: `border-color: #0052FF; box-shadow: 0 0 0 3px rgba(0, 82, 255, 0.1);`

### Badges

**Default**
```css
background: #F1F5F9;
color: #64748B;
border-radius: 6px;
padding: 4px 12px;
font-size: 12px;
font-weight: 600;
```

**Success (Winning)**
```css
background: #D1FAE5;
color: #065F46;
```

**Error (Losing)**
```css
background: #FEE2E2;
color: #991B1B;
```

**Info**
```css
background: #DBEAFE;
color: #1E40AF;
```

---

## Iconography

### Style Guidelines
- **Line weight:** 2px
- **Style:** Rounded corners, clean lines
- **Size:** 24px default (16px, 20px, 24px, 32px variants)
- **Color:** Inherit from parent or use Charcoal (#18181B)

### Recommended Icon Library
**Lucide Icons** - https://lucide.dev
- Matches brand aesthetic
- Consistent line weight
- Extensive library

### Key Icons
- Gavel: Legal authority
- TrendingUp: Market growth
- CheckCircle: Verified/confirmed
- Scale: Balance/judgment
- ChartBar: Analytics
- Wallet: Crypto wallet
- Shield: Security
- Clock: Timing/countdown

---

## Motion & Animation

### Principles
- **Purposeful:** Animations guide user attention
- **Snappy:** 200-300ms for most transitions
- **Smooth:** Use cubic-bezier easing

### Easing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0.0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### Standard Transitions
```css
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover Effects
- Buttons: Slight lift (2-4px) + shadow
- Cards: Larger lift (4-8px) + shadow
- Links: Color change only

### Loading States
Use skeleton screens with shimmer effect:
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

---

## Voice & Tone

### Brand Personality
- **Confident** but not arrogant
- **Sophisticated** but not stuffy  
- **Innovative** but not reckless
- **Transparent** and trustworthy
- **Professional** with personality

### Writing Guidelines

**Do:**
- ✅ Use clear, direct language
- ✅ Lead with benefits
- ✅ Be specific with numbers and data
- ✅ Acknowledge risks honestly
- ✅ Use active voice

**Don't:**
- ❌ Overhype or make promises you can't keep
- ❌ Use excessive legal jargon (unless explaining)
- ❌ Be overly casual or use slang
- ❌ Make light of legal proceedings
- ❌ Guarantee outcomes

### Example Copy Styles

**Hero Section:**
```
Predict Legal Outcomes. Trade With Confidence.
The world's first AI-powered prediction market for high-profile legal cases.
```

**Feature Description:**
```
Judge Analysis
Our ML models analyze thousands of judicial opinions to predict case outcomes 
with unprecedented accuracy.
```

**Call to Action:**
```
Start Trading → [not "Click Here" or "Learn More"]
Connect Wallet → [not "Sign Up"]
View Markets → [not "See More"]
```

**Error Messages:**
```
Transaction Failed
We couldn't process your bet. Please check your wallet balance and try again.
[Retry] [Contact Support]
```

---

## Photography & Imagery

### Style Guidelines
- **Professional:** High-quality, crisp imagery
- **Modern:** Contemporary settings and lighting
- **Diverse:** Represent various people and perspectives
- **Authentic:** Real people, not overly staged stock photos

### Image Treatment
- Slight blue/purple color grade to match brand
- High contrast, sharp focus
- Avoid overly saturated colors

### Illustrations
- **Style:** Geometric, clean, modern
- **Colors:** Brand palette only
- **Use:** Complex concepts, empty states, onboarding

### When to Use
- **Photos:** Team, real users, event coverage
- **Illustrations:** Features, benefits, abstract concepts
- **Icons:** UI elements, navigation, small callouts

---

## Layout & Grid

### Desktop Grid
- **Max width:** 1280px
- **Columns:** 12-column grid
- **Gutter:** 24px
- **Margin:** 48px (responsive)

### Mobile Grid
- **Columns:** 4-column grid
- **Gutter:** 16px
- **Margin:** 16px

### Breakpoints
```css
/* Mobile */
@media (max-width: 639px) { ... }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }

/* Large Desktop */
@media (min-width: 1280px) { ... }
```

---

## Accessibility

### Color Contrast
All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18px+): 3:1 contrast ratio minimum

### Focus States
Always include visible focus indicators:
```css
*:focus-visible {
  outline: 2px solid #0052FF;
  outline-offset: 2px;
}
```

### Alt Text
- Descriptive alt text for all images
- Empty alt (`alt=""`) for decorative images
- SVG logos should include `<title>` tags

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Logical tab order
- Skip navigation links where appropriate

---

## Social Media

### Profile Images
- Use icon-only version of Logo_10
- Square format: 400x400px minimum
- PNG with transparent background

### Cover Images
**Twitter/X:** 1500 x 500px
**LinkedIn:** 1584 x 396px
**Facebook:** 820 x 312px

Use brand gradient background with white logo

### Post Templates

**Announcement Posts:**
- Brand gradient background
- White text + logo
- Bold headline (Inter Bold)
- Image ratio: 1:1 for feed, 16:9 for LinkedIn

**Market Updates:**
- Case name + outcome probabilities
- Clean data visualization
- Brand colors only

**Educational Content:**
- Simple illustrations
- Key stat or quote highlighted
- Consistent template format

---

## Email Design

### Header
- Logo centered or left-aligned
- Royal Blue (#0052FF) background
- White text

### Body
- Max width: 600px
- White background
- Charcoal (#18181B) text
- Generous padding (24px)

### CTA Buttons
- Primary button styling
- Center-aligned
- Clear, action-oriented copy

### Footer
- Light Gray (#F1F5F9) background
- Slate Gray (#64748B) text
- Social icons
- Unsubscribe link

---

## Quick Reference

### Color Codes
```
Royal Blue:    #0052FF
Deep Purple:   #6366F1
Gold:          #FBBF24
Charcoal:      #18181B
Slate Gray:    #64748B
Light Gray:    #F1F5F9
```

### Fonts
```
Primary: Inter (400, 500, 600, 700)
Mono: JetBrains Mono (500)
```

### Border Radius
```
Small:   4px
Default: 8px
Large:   12px
XL:      16px
Circle:  9999px
```

### Shadows
```css
/* Subtle */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

/* Medium */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

/* Large */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

/* Brand Glow */
box-shadow: 0 8px 24px rgba(0, 82, 255, 0.3);
```

---

## Brand Assets Download

All brand assets should be available in the following formats:

### Logos
- SVG (vector, for web)
- PNG (transparent, multiple sizes: 512px, 1024px, 2048px)
- PDF (for print)

### Color Palette
- ASE (Adobe Swatch Exchange)
- CSS variables file
- Figma/Sketch shared library

### Typography
- Google Fonts link
- Web font files (WOFF2)

---

## Questions?

For brand usage questions or asset requests:
- Email: brand@precedence.market
- Brand assets: precedence.market/brand

**Last Updated:** November 2025
**Version:** 1.0
