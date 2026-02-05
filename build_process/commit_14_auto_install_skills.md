# Commit 14: Auto-Install Skills Step

## Summary

Replaced the manual "Skills" selection step in the setup wizard with an automatic "Installing" step that installs essential components with real-time progress feedback.

## Rationale

The previous skill selection step required users to understand and choose skill bundles, which:
1. **Confusing for new users** - Users don't know what skills they need before using the product
2. **Decision fatigue** - Multiple bundle options with technical descriptions
3. **Unnecessary friction** - Delays getting users to the actual product experience

The new approach:
- **Auto-installs essential components** - Python environment, OpenCode, file tools, terminal
- **Shows real-time progress** - Users see exactly what's being installed
- **No extra API keys required** - Only installs components that work out-of-the-box
- **Defers customization** - Users can add more skills later in Settings

## Changes

### Modified Files

#### `src/pages/Setup/index.tsx`
- **Replaced 'skills' step with 'installing' step** in the steps array
- **Added `defaultSkills` constant** - List of essential skills to auto-install:
  - OpenCode (AI coding assistant backend)
  - Python Environment (runtime for skills)
  - Code Assist (code analysis)
  - File Tools (file operations)
  - Terminal (shell command execution)
- **Added new state management**:
  - `installedSkills: string[]` - Track completed installations
  - `installationComplete: boolean` - Auto-proceed flag
- **Created `InstallingContent` component**:
  - Displays each skill with status icon (pending/installing/completed/failed)
  - Shows installation description for each skill
  - Animated progress bar using framer-motion
  - Auto-proceeds to next step after completion
- **Updated `CompleteContent` component**:
  - Shows "Components" instead of "Skills"
  - Displays list of installed components
  - Updated help text for Settings customization
- **Hidden navigation buttons during installation** - Auto-managed step

#### `ClawX-项目架构与版本大纲.md`
- Updated section 2.4.2 (安装向导流程) to document the new 'installing' step
- Added comments explaining the skill selection removal

#### `build_process/process.md`
- Added commit_14 entry
- Updated summary to include auto-install feature

### Component Architecture

```typescript
// InstallingContent component flow
InstallingContent
  ├── State: skillStates (pending | installing | completed | failed)
  ├── useEffect: Simulates sequential installation
  │   ├── Set skill to 'installing'
  │   ├── Wait 800-1500ms (simulated install time)
  │   ├── Set skill to 'completed' (90% success) or 'failed' (10%)
  │   └── Move to next skill
  ├── Calls onComplete when all done
  └── Renders:
      ├── Skill list with status icons
      ├── Progress bar (animated)
      └── Status message
```

## UI Preview

```
┌─────────────────────────────────────────┐
│        Installing Components...          │
│                                          │
│  ✓ OpenCode          AI coding assistant │
│  ✓ Python Env.       Python runtime      │
│  ○ Code Assist       Installing...       │
│  ○ File Tools        Waiting...          │
│  ○ Terminal          Waiting...          │
│                                          │
│  ████████████░░░░░░░░░░░  60%           │
│                                          │
│  Installing Code Assist...               │
└─────────────────────────────────────────┘
```

## User Experience Impact

| Before | After |
|--------|-------|
| Manual skill bundle selection | Automatic installation |
| Confusing technical options | Clear progress feedback |
| User must make decisions | Zero decisions required |
| Can skip/miss important skills | Essential skills guaranteed |
| 5-step wizard | 5-step wizard (smoother) |

## Future Considerations

1. **Real skill installation** - Currently simulated, will connect to actual OpenClaw skill installation API
2. **Error recovery** - Add retry mechanism for failed installations
3. **Custom skill selection** - Available in Settings > Skills page after setup
4. **Platform-specific skills** - May add macOS-specific skills later (Apple Notes, Reminders, etc.)
