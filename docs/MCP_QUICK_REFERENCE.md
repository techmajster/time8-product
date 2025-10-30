# MCP Quick Reference Card

## 🚀 Quick Start

1. **Restart Cursor completely** (Cmd+Q, then reopen)
2. Open this project in Cursor
3. Start using MCP commands in chat!

## 💬 Example Commands

### shadcn MCP Commands

```
"List all available shadcn components"
"Show me form-related components from shadcn"
"Add the calendar component to my project"
"Install dialog, sheet, and drawer components"
"What does the data-table component do?"
"Add all the form components (input, select, checkbox, radio)"
"Install the chart components"
```

### Figma MCP Commands

```
"Show me the components in Figma file: [URL]"
"Get the colors from this Figma design: [URL]"
"Generate React code for this Figma component: [URL]"
"What text styles are used in this design?"
"Extract the spacing values from this Figma file"
"Show me the layout structure of this design"
```

### Combined Workflow

```
"Get the button design from Figma [URL] and find matching shadcn component"
"Extract colors from Figma [URL] and update my theme config"
"Compare this Figma design with the shadcn button component"
"Generate a form based on this Figma design using shadcn components"
```

## 📁 File Locations

- **MCP Config**: `.cursor/mcp.json`
- **Setup Guide**: `docs/MCP_SETUP_GUIDE.md`
- **This File**: `docs/MCP_QUICK_REFERENCE.md`

## 🔧 Current Configuration

### shadcn MCP ✅
- **Status**: Configured and ready
- **Type**: npm-based
- **Command**: `npx shadcn@latest mcp`

### Figma MCP ✅
- **Status**: Configured (Remote Server)
- **Type**: Remote SSE
- **URL**: `https://mcp.figma.com/mcp`

## 🎯 Tips

1. **Be specific** - Include Figma URLs or component names
2. **Natural language** - Write like you're talking to a designer
3. **Combine requests** - Ask for multiple things at once
4. **Check results** - Review generated code before using

## ⚡ Common Tasks

| Task | Command Example |
|------|----------------|
| Browse components | "Show all shadcn components" |
| Install component | "Add the button component" |
| Get Figma design | "Get design from [Figma URL]" |
| Generate code | "Create React component from [Figma URL]" |
| Extract colors | "What colors are in [Figma URL]?" |
| Multiple installs | "Add button, input, and card components" |

## 🔄 If Something Doesn't Work

1. **Restart Cursor** (complete quit, not just close)
2. **Check config** - View `.cursor/mcp.json`
3. **Test manually** - Run `npx shadcn@latest mcp` in terminal
4. **Read setup guide** - See `docs/MCP_SETUP_GUIDE.md`

## 📞 Need Help?

See the full setup guide:
```bash
cat docs/MCP_SETUP_GUIDE.md
```

Or check the configuration:
```bash
cat .cursor/mcp.json
```

