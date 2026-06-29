#!/usr/bin/env python3
"""Replace SCSS token variables with plain CSS values in Angular component inline styles."""
import re, os, glob

# SCSS var → CSS value mapping (from _tokens.scss)
TOKENS = {
  # Spacing
  '$spacing-px': '1px', '$spacing-0-5': '0.125rem', '$spacing-1': '0.25rem',
  '$spacing-1-5': '0.375rem', '$spacing-2': '0.5rem', '$spacing-2-5': '0.625rem',
  '$spacing-3': '0.75rem', '$spacing-3-5': '0.875rem', '$spacing-4': '1rem',
  '$spacing-5': '1.25rem', '$spacing-6': '1.5rem', '$spacing-7': '1.75rem',
  '$spacing-8': '2rem', '$spacing-9': '2.25rem', '$spacing-10': '2.5rem',
  '$spacing-11': '2.75rem', '$spacing-12': '3rem', '$spacing-14': '3.5rem',
  '$spacing-16': '4rem', '$spacing-20': '5rem', '$spacing-24': '6rem',
  '$spacing-32': '8rem', '$spacing-40': '10rem', '$spacing-48': '12rem',
  # Font sizes
  '$font-size-2xs': '0.625rem', '$font-size-xs': '0.75rem', '$font-size-sm': '0.875rem',
  '$font-size-base': '1rem', '$font-size-lg': '1.125rem', '$font-size-xl': '1.25rem',
  '$font-size-2xl': '1.5rem', '$font-size-3xl': '1.875rem', '$font-size-4xl': '2.25rem',
  '$font-size-5xl': '3rem',
  # Font weights
  '$font-weight-normal': '400', '$font-weight-medium': '500',
  '$font-weight-semibold': '600', '$font-weight-bold': '700', '$font-weight-extrabold': '800',
  # Line heights
  '$line-height-none': '1', '$line-height-tight': '1.25', '$line-height-snug': '1.375',
  '$line-height-normal': '1.5', '$line-height-relaxed': '1.625', '$line-height-loose': '2',
  # Letter spacing
  '$letter-spacing-tighter': '-0.05em', '$letter-spacing-tight': '-0.025em',
  '$letter-spacing-normal': '0', '$letter-spacing-wide': '0.025em',
  '$letter-spacing-wider': '0.05em', '$letter-spacing-widest': '0.1em',
  # Radius
  '$radius-none': '0', '$radius-sm': '0.25rem', '$radius-default': '0.375rem',
  '$radius-md': '0.5rem', '$radius-lg': '0.75rem', '$radius-xl': '1rem',
  '$radius-2xl': '1.25rem', '$radius-3xl': '1.5rem', '$radius-full': '9999px',
  # Shadows
  '$shadow-xs': '0 1px 2px 0 rgba(0,0,0,.05)',
  '$shadow-sm': '0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1)',
  '$shadow-default': '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)',
  '$shadow-md': '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)',
  '$shadow-lg': '0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)',
  '$shadow-xl': '0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)',
  '$shadow-2xl': '0 25px 50px -12px rgba(0,0,0,.25)',
  '$shadow-inner': 'inset 0 2px 4px 0 rgba(0,0,0,.05)',
  '$shadow-primary': '0 4px 14px 0 rgba(49,151,149,.25)',
  '$shadow-primary-lg': '0 10px 40px -10px rgba(49,151,149,.35)',
  # Component tokens
  '$button-height-sm': '32px', '$button-height-md': '40px',
  '$button-height-lg': '48px', '$button-height-xl': '56px',
  '$input-height-sm': '32px', '$input-height-md': '40px', '$input-height-lg': '48px',
  '$card-padding': '1.5rem', '$card-radius': '1rem', '$card-shadow': '0 1px 3px 0 rgba(0,0,0,.1)',
  '$table-row-height': '56px', '$table-header-height': '48px',
  '$avatar-size-xs': '24px', '$avatar-size-sm': '32px', '$avatar-size-md': '40px',
  '$avatar-size-lg': '48px', '$avatar-size-xl': '64px', '$avatar-size-2xl': '96px',
  '$badge-height-sm': '20px', '$badge-height-md': '24px', '$badge-height-lg': '28px',
  # Transitions
  '$transition-duration-fast': '150ms', '$transition-duration-normal': '200ms',
  '$transition-duration-slow': '300ms', '$transition-duration-slower': '500ms',
  '$transition-timing-default': 'cubic-bezier(0.4,0,0.2,1)',
  # Breakpoints (used in @media)
  '$breakpoint-xs': '0px', '$breakpoint-sm': '640px', '$breakpoint-md': '768px',
  '$breakpoint-lg': '1024px', '$breakpoint-xl': '1280px', '$breakpoint-2xl': '1536px',
  # Layout
  '$sidebar-width': '280px', '$sidebar-collapsed-width': '80px',
  '$header-height': '64px',
  # Font families (keep as CSS values)
  "$font-family-sans": "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  "$font-family-mono": "'JetBrains Mono','SF Mono','Fira Code',monospace",
  "$font-family-display": "'Plus Jakarta Sans','Inter',-apple-system,sans-serif",
  # Primary colors
  '$color-primary-50': '#E6FFFA', '$color-primary-100': '#B2F5EA',
  '$color-primary-200': '#81E6D9', '$color-primary-300': '#4FD1C5',
  '$color-primary-400': '#38B2AC', '$color-primary-500': '#319795',
  '$color-primary-600': '#2C7A7B', '$color-primary-700': '#285E61',
  '$color-primary-800': '#234E52', '$color-primary-900': '#1D4044',
  # Secondary colors
  '$color-secondary-50': '#EBF4FF', '$color-secondary-100': '#C3DAFE',
  '$color-secondary-200': '#A3BFFA', '$color-secondary-300': '#7F9CF5',
  '$color-secondary-400': '#667EEA', '$color-secondary-500': '#5A67D8',
  '$color-secondary-600': '#4C51BF', '$color-secondary-700': '#434190',
  # Accent colors
  '$color-accent-50': '#FFFAF0', '$color-accent-100': '#FEEBCB',
  '$color-accent-200': '#FBD38D', '$color-accent-300': '#F6AD55',
  '$color-accent-400': '#ED8936', '$color-accent-500': '#DD6B20',
  '$color-accent-600': '#C05621', '$color-accent-700': '#9C4221',
  # Success
  '$color-success-50': '#F0FFF4', '$color-success-100': '#C6F6D5',
  '$color-success-200': '#9AE6B4', '$color-success-300': '#68D391',
  '$color-success-400': '#48BB78', '$color-success-500': '#38A169',
  '$color-success-600': '#2F855A', '$color-success-700': '#276749',
  # Warning
  '$color-warning-50': '#FFFBEB', '$color-warning-100': '#FEF3C7',
  '$color-warning-200': '#FDE68A', '$color-warning-300': '#FCD34D',
  '$color-warning-400': '#FBBF24', '$color-warning-500': '#F59E0B',
  '$color-warning-600': '#D97706', '$color-warning-700': '#B45309',
  # Error
  '$color-error-50': '#FEF2F2', '$color-error-100': '#FEE2E2',
  '$color-error-200': '#FECACA', '$color-error-300': '#FCA5A5',
  '$color-error-400': '#F87171', '$color-error-500': '#EF4444',
  '$color-error-600': '#DC2626', '$color-error-700': '#B91C1C',
  # Info
  '$color-info-50': '#F0F9FF', '$color-info-100': '#E0F2FE',
  '$color-info-200': '#BAE6FD', '$color-info-300': '#7DD3FC',
  '$color-info-400': '#38BDF8', '$color-info-500': '#0EA5E9',
  '$color-info-600': '#0284C7', '$color-info-700': '#0369A1',
  # Neutral
  '$color-neutral-0': '#FFFFFF', '$color-neutral-25': '#FCFCFD',
  '$color-neutral-50': '#F8FAFC', '$color-neutral-100': '#F1F5F9',
  '$color-neutral-200': '#E2E8F0', '$color-neutral-300': '#CBD5E1',
  '$color-neutral-400': '#94A3B8', '$color-neutral-500': '#64748B',
  '$color-neutral-600': '#475569', '$color-neutral-700': '#334155',
  '$color-neutral-800': '#1E293B', '$color-neutral-900': '#0F172A',
  '$color-neutral-950': '#020617',
  # Semantic text/bg/border vars
  '$bg-primary': '#FFFFFF', '$bg-secondary': '#F8FAFC', '$bg-tertiary': '#F1F5F9',
  '$bg-inverse': '#0F172A', '$bg-brand': '#2C7A7B', '$bg-brand-subtle': '#E6FFFA',
  '$bg-accent': '#DD6B20', '$bg-accent-subtle': '#FFFAF0',
  '$text-primary': '#0F172A', '$text-secondary': '#475569', '$text-tertiary': '#64748B',
  '$text-muted': '#94A3B8', '$text-inverse': '#FFFFFF', '$text-brand': '#2C7A7B',
  '$text-accent': '#C05621', '$text-success': '#2F855A', '$text-warning': '#D97706',
  '$text-error': '#DC2626', '$text-info': '#0284C7',
  '$border-default': '#E2E8F0', '$border-subtle': '#F1F5F9',
  '$border-strong': '#CBD5E1', '$border-focus': '#319795',
  '$border-error': '#EF4444', '$border-success': '#38A169',
}

def replace_tokens(content):
  # Remove @use line
  content = re.sub(r"@use 'design-system/tokens' as \*;\s*\n?", '', content)
  content = re.sub(r'@use "design-system/tokens" as \*;\s*\n?', '', content)
  # Replace SCSS single-line comments with CSS comments
  content = re.sub(r'(?<![:/])//(?!/) ([^\n]*)', r'/* \1 */', content)
  # Replace tokens (longest match first to avoid partial replacements)
  for scss_var, css_val in sorted(TOKENS.items(), key=lambda x: -len(x[0])):
    # Only replace when followed by a non-alphanumeric/-/_ character (word boundary)
    pattern = re.escape(scss_var) + r'(?=[^a-zA-Z0-9_-]|$)'
    content = re.sub(pattern, css_val, content)
  return content

def process_file(path):
  with open(path, 'r', encoding='utf-8') as f:
    original = f.read()
  if "@use 'design-system/tokens'" not in original and '@use "design-system/tokens"' not in original:
    return False
  updated = replace_tokens(original)
  if updated != original:
    with open(path, 'w', encoding='utf-8') as f:
      f.write(updated)
    return True
  return False

# Process all TypeScript component files under src/app
root = os.path.join(os.path.dirname(__file__), 'src')
files = glob.glob(os.path.join(root, '**', '*.ts'), recursive=True)
changed = []
for f in files:
  if process_file(f):
    changed.append(f.replace(root, 'src'))

print(f"Updated {len(changed)} files:")
for f in changed:
  print(f"  {f}")

# ─── Phase 2: Flatten &--modifier BEM nesting ────────────────────────────────
import re, os, glob

def flatten_bem_nesting(content):
    """Convert &--modifier { ... } SCSS nesting to flat .parent--modifier { ... } CSS selectors."""
    # We need to find parent selector contexts and expand &--modifier
    # This regex approach handles simple single-level nesting
    
    def expand_block(parent, block_content):
        """Expand &--modifier inside a parent block."""
        result = ''
        i = 0
        while i < len(block_content):
            # Look for &--something {
            m = re.search(r'&--([a-zA-Z0-9_-]+)\s*\{', block_content[i:])
            if not m:
                result += block_content[i:]
                break
            result += block_content[i:i+m.start()]
            modifier = m.group(1)
            start = i + m.end()
            # Find matching closing brace
            depth = 1
            j = start
            while j < len(block_content) and depth > 0:
                if block_content[j] == '{': depth += 1
                elif block_content[j] == '}': depth -= 1
                j += 1
            inner = block_content[start:j-1]
            result += f'\n    {parent}--{modifier} {{{inner}}}'
            i = i + m.start() + (j - m.start() - m.start())
            # Recalculate
            i = i + m.end() + (j - (i + m.end())) 
            break  # simplified - handle one at a time via multiple passes
        return result
    
    # Simple approach: use regex to expand common patterns
    # Pattern: .selector { ... &--modifier { rules } ... }
    def replace_bem(match):
        indent = match.group(1)
        modifier = match.group(2)
        rules = match.group(3)
        return f'{indent}:{modifier} {{ {rules} }}'  # placeholder
    
    return content

# Better approach: direct regex substitution for known patterns
def fix_bem_in_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '&--' not in content:
        return False
    
    # Find all CSS blocks in the styles array and expand &--modifier
    # We'll use a line-by-line approach tracking parent selectors
    lines = content.split('\n')
    result = []
    selector_stack = []
    
    for line in lines:
        stripped = line.lstrip()
        
        if stripped.startswith('&--') and '{' in stripped:
            # Extract modifier name and rest
            m = re.match(r'&--([a-zA-Z0-9_-]+)(.*)', stripped)
            if m and selector_stack:
                modifier = m.group(1)
                rest = m.group(2)
                parent = selector_stack[-1].strip().rstrip('{').strip()
                # Replace &--modifier with parent--modifier
                new_selector = f'{parent}--{modifier}{rest}'
                indent = line[:len(line) - len(stripped)]
                result.append(f'{indent}{new_selector}')
                continue
        
        # Track opening selectors
        if stripped and '{' in stripped and not stripped.startswith('//') and not stripped.startswith('/*') and not stripped.startswith('@') and not stripped.startswith('&:'):
            # Check if this might be a selector (not a property)
            if not ':' in stripped.split('{')[0] or '::' in stripped.split('{')[0]:
                selector_stack.append(stripped)
        elif stripped == '}' and selector_stack:
            selector_stack.pop()
        
        result.append(line)
    
    new_content = '\n'.join(result)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

# Process shared component files
root2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'app', 'shared')
files2 = glob.glob(os.path.join(root2, '**', '*.ts'), recursive=True)
for f in files2:
    fix_bem_in_file(f)
print("BEM flattening complete")
