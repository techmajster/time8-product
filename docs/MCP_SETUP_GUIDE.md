# MCP Setup Guide - Figma & shadcn

This guide explains how to use the MCP (Model Context Protocol) servers for Figma and shadcn that have been configured in your project.

## ✅ What's Already Installed

Your project now has MCP configuration at `.cursor/mcp.json` with:

1. **shadcn MCP Server** - For browsing and installing shadcn components
2. **Figma Remote MCP Server** - For accessing Figma designs

## 🎯 How to Use

### shadcn MCP Server

Once Cursor restarts, you can use natural language commands like:

- "Show me all available shadcn components"
- "Add the calendar component to my project"
- "Install the data-table and pagination components"
- "What shadcn components are available for forms?"
- "Add the toast component with all dependencies"

The MCP server will:
- Browse the shadcn registry
- Search for components
- Install components with proper dependencies
- Update your `components.json` configuration

### Figma MCP Server

You have **two options** for Figma MCP:

#### Option 1: Remote MCP Server (Currently Configured)

This is already set up and uses Figma's hosted server at `https://mcp.figma.com/mcp`.

**To use it:**

1. Open your Figma design in the browser
2. Enable Dev Mode (toggle in toolbar)
3. In the right inspect panel, look for "MCP" or "Set up an MCP client"
4. You may need to authenticate/connect your Figma account
5. Copy any file URLs or IDs you want to work with

**In Cursor, you can then ask:**
- "Get the design from Figma file [URL]"
- "Show me the components in this Figma file"
- "Generate code from this Figma design"
- "What are the colors used in this design?"

#### Option 2: Desktop MCP Server (Recommended for Better Performance)

If you prefer the desktop app:

1. **Open Figma Desktop App**
   ```bash
   open -a "Figma"
   ```

2. **Open a Design File**

3. **Enable Dev Mode**
   - Click the toggle switch in the toolbar (with nothing selected)

4. **Enable MCP Server**
   - In the right sidebar, find and enable the MCP server
   - Copy the server URL it provides (something like `http://localhost:XXXX`)

5. **Update Configuration**
   Edit `.cursor/mcp.json` and replace the `figma-remote` section with:
   ```json
   "figma-desktop": {
     "url": "YOUR_COPIED_URL_HERE",
     "transport": {
       "type": "sse"
     }
   }
   ```

6. **Restart Cursor**

## 🔄 Restart Cursor

After any configuration changes, **restart Cursor** to load the MCP servers:

1. Close all Cursor windows
2. Quit Cursor completely (Cmd+Q)
3. Reopen Cursor
4. Open your project

## 🧪 Test the Setup

### Test shadcn MCP:

Ask in Cursor chat:
```
"List all available shadcn components"
```

### Test Figma MCP:

1. Open a Figma file in browser or desktop app
2. Copy the file URL or ID
3. Ask in Cursor chat:
```
"Show me the design from this Figma file: [YOUR_FIGMA_URL]"
```

## 📝 Configuration File Location

Your MCP configuration is stored at:
```
.cursor/mcp.json
```

## 🔍 Troubleshooting

### shadcn MCP Not Working

1. Make sure you have npm/npx installed:
   ```bash
   npm --version
   npx --version
   ```

2. Test the command manually:
   ```bash
   npx shadcn@latest mcp
   ```

3. Check your `components.json` exists in project root

### Figma MCP Not Working

#### For Remote Server:
1. Make sure you're logged into Figma in your browser
2. Open the Figma file and enable Dev Mode
3. Look for MCP connection status in the Dev Mode panel

#### For Desktop Server:
1. Make sure Figma desktop app is running
2. Make sure Dev Mode is enabled
3. Make sure MCP server is enabled in the sidebar
4. Check the server URL is correct in `.cursor/mcp.json`

### Cursor Not Recognizing MCP Servers

1. Make sure `.cursor/mcp.json` exists
2. Check JSON syntax is valid
3. Completely quit and restart Cursor (not just close window)
4. Check Cursor's output/developer console for errors

## 📚 Additional Resources

- [Figma MCP Desktop Server Setup](https://help.figma.com/hc/en-us/articles/35281186390679)
- [Figma MCP Remote Server Setup](https://help.figma.com/hc/en-us/articles/35281350665623)
- [shadcn MCP Documentation](https://ui.shadcn.com/docs/mcp)

## 🎉 What You Can Build Now

With both MCP servers:

1. **Design-to-Code Workflow**
   - Get designs from Figma
   - Generate component code
   - Install matching shadcn components
   - Apply design tokens/colors

2. **Component Discovery**
   - Browse available shadcn components
   - See what's already in your project
   - Find components for specific use cases

3. **Rapid Prototyping**
   - Grab designs from Figma
   - Install shadcn components
   - Build UI matching designs quickly

## 🔐 Security Note

The MCP servers run locally and communicate with:
- npm registry (for shadcn)
- Figma's servers (for design data)

No sensitive code or data leaves your machine except when:
- Installing npm packages (standard npm behavior)
- Fetching Figma designs (requires your Figma authentication)

