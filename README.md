# Tingly Run / Debug Configurations

A Jetbrains-inspired debug and run configuration manager for Visual Studio Code that provides an intuitive UI for managing debug configurations with seamless launch.json synchronization.

## Overview

Tingly transforms the way you manage debug configurations in VS Code by providing a clean, organized interface similar to popular IDEs like PyCharm. Say goodbye to manually editing JSON files and hello to visual configuration management.

## ✨ Key Features

### 🎯 **Configuration Management**
- **Clean Tree View**: Organized configuration display with type-specific icons
- **Launch.json Sync**: Automatic synchronization with your `.vscode/launch.json`
- **Compound Support**: Full support for compound debug configurations
- **Auto-refresh**: Real-time updates when launch.json changes

### 🚀 **Quick Actions**
- **Smart Configuration**: Instant config creation from active files with intelligent type detection
- **One-click Debugging**: Launch configurations with or without debugging
- **Duplicate Configurations**: Quickly copy and modify existing setups
- **Safe Deletion**: Remove configurations with confirmation prompts

### ⚙️ **Visual Configuration Editor**
- **Form-based Interface**: Edit all launch.json properties through intuitive forms
- **Real-time JSON Preview**: See the generated JSON as you type
- **Dynamic Fields**: Add or remove configuration properties on demand
- **Smart Value Parsing**: Automatic detection of JSON vs string values
- **Error Validation**: Instant feedback for configuration conflicts

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "Tingly Run / Debug Configurations"
4. Click Install

### First Time Setup

1. Open the Debug view (**Ctrl+Shift+D** or **Cmd+Shift+D**)
2. Locate the **"ddd Configurations"** panel in the Debug sidebar
3. Your existing debug configurations will appear automatically

## 📖 Usage Guide

### Creating New Configurations

#### Quick Configuration (Recommended)
1. Open the file you want to debug
2. Click the **💡 Quick Configuration** button in the Configurations panel
3. A configuration is automatically created based on your file type

#### Manual Configuration
1. Click the **➕ Add Configuration** button
2. Enter a descriptive name
3. Select your configuration type:
   - Node.js
   - Python
   - Chrome/Edge/Firefox
   - Extension Host (VS Code extensions)
   - CoreCLR (.NET)
   - Custom types
4. Choose launch or attach mode
5. The configuration is automatically saved to launch.json

### Managing Existing Configurations

#### Toolbar Actions
- **▶️ Run**: Execute without debugging
- **🐛 Debug**: Start debugging session
- **⚙️ Settings**: Open visual configuration editor

#### Context Menu (Right-click)
- **Edit**: Modify configuration name
- **Duplicate**: Create a copy with modifications
- **Delete**: Remove with confirmation

### Configuration Editor Features

Click the **⚙️** icon on any configuration to access advanced editing:

- **Property Management**: Add/remove configuration fields dynamically
- **Live JSON Preview**: See real-time JSON output
- **Name Validation**: Prevent duplicate configuration names
- **Smart Input**: Automatic value type detection
- **Error Handling**: Clear validation messages

## ⚙️ Extension Settings

### Click Behavior

**`tingly.debug.clickBehavior`**: Controls interaction with configuration items

- **`openSettings`** (default): Click opens configuration editor
- **`none`**: Click has no action (use toolbar buttons)

#### How to Configure
1. Open VS Code Settings (**Ctrl+,** or **Cmd+,**)
2. Search for "Debug Configurations"
3. Find "Click Behavior" option
4. Select your preferred behavior

## 🔧 Compatibility

This extension seamlessly integrates with:

- **Standard VS Code launch.json format**
- **All VS Code debug attributes**
- **Workspace-specific configurations**
- **Compound debug configurations**
- **Multi-root workspaces**

## 📋 System Requirements

- **VS Code 1.105.0** or higher
- **Web extension compatible** (runs in browser-based VS Code)

## 🛠️ Supported Languages & Runtimes

| Language/Platform | Debug Types |
|-------------------|-------------|
| **JavaScript/TypeScript** | Node.js, Chrome, Edge, Firefox |
| **Python** | Python debugging |
| **.NET** | CoreCLR debugging |
| **VS Code Extensions** | Extension Host debugging |
| **Custom** | Any custom debug configuration |

## 📝 Changelog

see [CHANGELOG](CHANGELOG.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Reporting bugs
- Requesting features
- Submitting pull requests
- Development setup

## 📄 License

This extension is released under the [MIT License](LICENSE).

## 🐛 Troubleshooting

### Common Issues

**Q: Configurations not appearing?**
A: Ensure you have a `.vscode/launch.json` file in your workspace. The extension automatically creates one when you add your first configuration.

**Q: Click behavior not working?**
A: Check your `tingly.debug.clickBehavior` setting in VS Code preferences.

**Q: Configuration not saving?**
A: Verify your workspace folder has write permissions and check if launch.json is read-only.

### Support

For issues and feature requests:
- Create an issue on our [GitHub repository](https://github.com/your-repo/tingly-debug)
- Check existing issues for solutions

---

**Transform your VS Code debugging experience with Tingly! 🚀**