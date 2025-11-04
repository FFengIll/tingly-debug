import * as vscode from 'vscode';
import { DebugConfigurationProvider, DebugConfigurationItem } from './debugTreeView';
import { LaunchConfiguration, LaunchCompound } from './types';
import { ConfigurationEditor } from './configurationEditor';
import { FileTypeMapper } from './fileTypeMapper';
import { SymbolDetector, CommandGenerator, SymbolInfo } from './symbolCommandGenerator';

export function registerCommandHandlers(
    context: vscode.ExtensionContext,
    provider: DebugConfigurationProvider,
    treeView: vscode.TreeView<DebugConfigurationItem>
): void {

    /**
     * Handle command generation for run or debug
     */
    async function handleGenerateCommand(commandType: 'run' | 'debug'): Promise<void> {
        try {
            // Get the selected symbol
            const symbol = await SymbolDetector.getSelectedSymbolPath();

            if (!symbol) {
                vscode.window.showWarningMessage('Please select a symbol (function, class, method, or test) to generate a command.');
                return;
            }

            // Generate the command
            const commandTemplate = commandType === 'run'
                ? await CommandGenerator.generateRunCommand(symbol)
                : await CommandGenerator.generateDebugCommand(symbol);

            if (!commandTemplate) {
                vscode.window.showErrorMessage(`Could not generate ${commandType} command for ${symbol.language} symbol "${symbol.name}"`);
                return;
            }

            // Format the command for display
            const formattedCommand = CommandGenerator.formatCommand(commandTemplate);

            // Show action options
            const action = await vscode.window.showQuickPick([
                { label: '$(terminal) Run in Terminal', description: `Execute command in integrated terminal`, value: 'terminal' },
                { label: '$(clippy) Copy to Clipboard', description: `Copy command to clipboard`, value: 'clipboard' },
                { label: '$(debug) Create Debug Configuration', description: `Add as debug configuration to launch.json`, value: 'debug' }
            ], {
                placeHolder: `Generated ${commandType} command: ${formattedCommand}`,
                title: `${commandType === 'run' ? 'Run' : 'Debug'} Command for "${symbol.name}"`
            });

            if (!action) {
                return;
            }

            switch (action.value) {
                case 'terminal':
                    await executeInTerminal(commandTemplate, symbol);
                    break;
                case 'clipboard':
                    await vscode.env.clipboard.writeText(formattedCommand);
                    vscode.window.showInformationMessage(`Command copied to clipboard: ${formattedCommand}`);
                    break;
                case 'debug':
                    await createDebugConfiguration(commandTemplate, symbol, provider);
                    break;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to generate command: ${errorMessage}`);
            console.error('Command generation error:', error);
        }
    }

    /**
     * Execute command in integrated terminal
     */
    async function executeInTerminal(commandTemplate: any, symbol: SymbolInfo): Promise<void> {
        const terminal = vscode.window.createTerminal({
            name: `${symbol.language} ${symbol.name}`,
            cwd: commandTemplate.cwd || symbol.workspaceRoot
        });

        // Set environment variables if needed
        if (commandTemplate.env) {
            Object.entries(commandTemplate.env).forEach(([key, value]) => {
                terminal.sendText(`export ${key}="${value}"`);
            });
        }

        // Execute the command
        const formattedCommand = CommandGenerator.formatCommand(commandTemplate);
        terminal.sendText(formattedCommand);
        terminal.show();

        vscode.window.showInformationMessage(`Running ${symbol.name} in terminal`);
    }

    /**
     * Create debug configuration from command template
     */
    async function createDebugConfiguration(commandTemplate: any, symbol: SymbolInfo, debugProvider: DebugConfigurationProvider): Promise<void> {
        const debugConfig = CommandGenerator.createDebugConfiguration(commandTemplate, symbol);

        try {
            await debugProvider.addConfiguration(debugConfig);
            vscode.window.showInformationMessage(`Debug configuration "${debugConfig.name}" created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create debug configuration: ${error}`);
        }
    }

    // Refresh command
    const refreshCommand = vscode.commands.registerCommand('ddd.debugConfig.refresh', async () => {
        try {
            // Show loading indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Refreshing debug configurations...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Reading launch.json..." });

                try {
                    // Force re-read of launch.json file
                    const configurations = await provider.getConfigurations();

                    progress.report({ increment: 50, message: "Updating configuration list..." });

                    // Refresh the tree view
                    provider.refresh();

                    progress.report({ increment: 100, message: "Complete!" });

                    // Show success message with configuration count
                    const configCount = configurations.length;
                    const message = configCount === 0
                        ? "No debug configurations found. Use the + button to add one."
                        : `Successfully refreshed! Found ${configCount} debug configuration${configCount === 1 ? '' : 's'}.`;

                    vscode.window.showInformationMessage(message);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('Refresh error:', error);
                    vscode.window.showErrorMessage(`Failed to refresh debug configurations: ${errorMessage}`);
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Refresh initialization error:', error);
            vscode.window.showErrorMessage(`Failed to initialize refresh: ${errorMessage}`);
        }
    });

    // Add configuration command
    const addCommand = vscode.commands.registerCommand('ddd.debugConfig.add', async () => {
        const name = await vscode.window.showInputBox({
            placeHolder: 'Enter configuration name',
            prompt: 'Configuration name'
        });

        if (name === undefined) {
            return;
        }

        const typeItems = [
            { label: 'Node.js', description: 'Launch Node.js application' },
            { label: 'Python', description: 'Launch Python application' },
            { label: 'Chrome', description: 'Launch Chrome browser' },
            { label: 'Edge', description: 'Launch Edge browser' },
            { label: 'Firefox', description: 'Launch Firefox browser' },
            { label: 'Extension Host', description: 'Launch VS Code Extension Host' },
            { label: 'CoreCLR (.NET)', description: 'Launch .NET application' },
            { label: 'Custom', description: 'Custom debug configuration' }
        ];

        const selectedType = await vscode.window.showQuickPick(typeItems, {
            placeHolder: 'Select configuration type'
        });

        if (selectedType === undefined) {
            return;
        }

        const requestType = await vscode.window.showQuickPick([
            { label: 'Launch', description: 'Start a new debug session' },
            { label: 'Attach', description: 'Attach to a running process' }
        ], {
            placeHolder: 'Select request type'
        });

        if (requestType === undefined) {
            return;
        }

        const typeMap: Record<string, string> = {
            'Node.js': 'node',
            'Python': 'python',
            'Chrome': 'chrome',
            'Edge': 'msedge',
            'Firefox': 'firefox',
            'Extension Host': 'extensionHost',
            'CoreCLR (.NET)': 'coreclr',
            'Custom': 'node'
        };

        const newConfig: LaunchConfiguration = {
            name: name,
            type: typeMap[selectedType.label],
            request: requestType.label.toLowerCase() as 'launch' | 'attach'
        };

        try {
            await provider.addConfiguration(newConfig);
            vscode.window.showInformationMessage(`Configuration "${name}" created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create configuration: ${error}`);
        }
    });

    // Edit configuration command
    const editCommand = vscode.commands.registerCommand('ddd.debugConfig.edit', async (item: DebugConfigurationItem) => {
        ConfigurationEditor.openConfigurationEditor(item.config, provider);
    });

    // Delete configuration command
    const deleteCommand = vscode.commands.registerCommand('ddd.debugConfig.delete', async (item: DebugConfigurationItem) => {
        const result = await vscode.window.showWarningMessage(
            `Are you sure you want to delete configuration "${item.config.name}"?`,
            'Delete',
            'Cancel'
        );

        if (result === 'Delete') {
            try {
                await provider.deleteConfiguration(item.config.name);
                vscode.window.showInformationMessage(`Configuration "${item.config.name}" deleted successfully!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete configuration: ${error}`);
            }
        }
    });

    // Duplicate configuration command
    const duplicateCommand = vscode.commands.registerCommand('ddd.debugConfig.duplicate', async (item: DebugConfigurationItem) => {
        try {
            await provider.duplicateConfiguration(item.config);
            vscode.window.showInformationMessage(`Configuration "${item.config.name}" duplicated successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to duplicate configuration: ${error}`);
        }
    });

    // Run configuration command
    const runCommand = vscode.commands.registerCommand('ddd.debugConfig.run', async (item: DebugConfigurationItem) => {
        try {
            // Only run configurations, not compounds
            if ('configurations' in item.config) {
                vscode.window.showWarningMessage('Cannot run compound configurations directly. Please select an individual configuration.');
                return;
            }

            // Disable all breakpoints for run mode
            await vscode.commands.executeCommand('workbench.debug.viewlet.action.disableAllBreakpoints');

            await vscode.debug.startDebugging(undefined, item.config as LaunchConfiguration);
            vscode.window.showInformationMessage(`Configuration "${item.config.name}" is now running (breakpoints disabled)!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start debug session: ${error}`);
        }
    });

    // Debug configuration command
    const debugCommand = vscode.commands.registerCommand('ddd.debugConfig.debug', async (item: DebugConfigurationItem) => {
        try {
            // Only debug configurations, not compounds
            if ('configurations' in item.config) {
                vscode.window.showWarningMessage('Cannot debug compound configurations directly. Please select an individual configuration.');
                return;
            }

            // Enable all breakpoints for debug mode
            await vscode.commands.executeCommand('workbench.debug.viewlet.action.enableAllBreakpoints');

            await vscode.debug.startDebugging(undefined, item.config as LaunchConfiguration);
            vscode.window.showInformationMessage(`Configuration "${item.config.name}" is now debugging (breakpoints enabled)!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start debug session: ${error}`);
        }
    });

    // Create configuration from current file
    const createFromFileCommand = vscode.commands.registerCommand('ddd.debugConfig.createFromFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file found. Please open a file to create a configuration.');
            return;
        }

        const currentFile = editor.document.uri.fsPath;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Check if file type is supported
        const fileTypeInfo = FileTypeMapper.getFileTypeInfo(currentFile);
        if (!fileTypeInfo) {
            const fileExtension = currentFile.split('.').pop()?.toLowerCase();
            vscode.window.showWarningMessage(
                `File type ".${fileExtension}" is not supported for automatic configuration creation. ` +
                `Supported types: ${Object.keys(FileTypeMapper.getSupportedFileTypes()).map(ext => `.${ext}`).join(', ')}`
            );
            return;
        }

        // Generate unique configuration name
        const baseConfigName = FileTypeMapper.generateConfigName(currentFile, workspaceRoot);
        const launchJson = await provider.readLaunchJson();
        let finalConfigName = baseConfigName;
        let counter = 1;

        while (launchJson.configurations.some(config => config.name === finalConfigName)) {
            finalConfigName = `${baseConfigName} - ${counter}`;
            counter++;
        }

        // Create default configuration using the mapper
        const newConfig = FileTypeMapper.createDefaultConfiguration(currentFile, workspaceRoot, finalConfigName);

        try {
            await provider.addConfiguration(newConfig);
            vscode.window.showInformationMessage(
                `Debug configuration "${finalConfigName}" created for ${fileTypeInfo.displayName} file!`
            );

            // Open the configuration editor for the newly created configuration
            setTimeout(async () => {
                try {
                    // Find the newly created configuration in the provider
                    const configItems = await provider.getConfigurations();
                    const createdItem = configItems.find(item => item.config.name === finalConfigName);
                    if (createdItem) {
                        ConfigurationEditor.openConfigurationEditor(createdItem.config, provider);
                    }
                } catch (error) {
                    console.error('Failed to open configuration editor:', error);
                }
            }, 500); // Small delay to ensure the UI updates
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create configuration: ${error}`);
        }
    });

    // Open settings command (using configuration editor)
    const openSettingsCommand = vscode.commands.registerCommand('ddd.debugConfig.openSettings', async (item: DebugConfigurationItem) => {
        ConfigurationEditor.openConfigurationEditor(item.config, provider);
    });

    // Generate run command from symbol
    const generateRunCommandCommand = vscode.commands.registerCommand('ddd.generateRunCommand', async () => {
        await handleGenerateCommand('run');
    });

    // Generate debug command from symbol
    const generateDebugCommandCommand = vscode.commands.registerCommand('ddd.generateDebugCommand', async () => {
        await handleGenerateCommand('debug');
    });

    // Hello world command
    const helloWorldCommand = vscode.commands.registerCommand('ddd.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Debug and Run Configurations extension!');
    });

    // Register all disposables
    context.subscriptions.push(
        refreshCommand,
        addCommand,
        editCommand,
        deleteCommand,
        duplicateCommand,
        runCommand,
        debugCommand,
        createFromFileCommand,
        openSettingsCommand,
        generateRunCommandCommand,
        generateDebugCommandCommand,
        helloWorldCommand
    );
}