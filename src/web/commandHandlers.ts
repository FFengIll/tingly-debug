import * as vscode from 'vscode';
import { DebugConfigurationProvider, DebugConfigurationItem } from './debugTreeView';
import { LaunchConfiguration, LaunchCompound } from './types';
import { ConfigurationEditor } from './configurationEditor';

export function registerCommandHandlers(
    context: vscode.ExtensionContext,
    provider: DebugConfigurationProvider,
    treeView: vscode.TreeView<DebugConfigurationItem>
): void {

    // Refresh command
    const refreshCommand = vscode.commands.registerCommand('ddd.debugConfig.refresh', () => {
        provider.refresh();
    });

    // Add configuration command
    const addCommand = vscode.commands.registerCommand('ddd.debugConfig.add', async () => {
        const name = await vscode.window.showInputBox({
            placeHolder: 'Enter configuration name',
            prompt: 'Configuration name'
        });

        if (name === undefined) return;

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

        if (selectedType === undefined) return;

        const requestType = await vscode.window.showQuickPick([
            { label: 'Launch', description: 'Start a new debug session' },
            { label: 'Attach', description: 'Attach to a running process' }
        ], {
            placeHolder: 'Select request type'
        });

        if (requestType === undefined) return;

        const newConfig: LaunchConfiguration = {
            name,
            type: selectedType.label.toLowerCase().replace(' ', '').replace('.', ''),
            request: requestType.label.toLowerCase()
        };

        try {
            await provider.addConfiguration(newConfig);
            vscode.window.showInformationMessage(`Configuration "${name}" added successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add configuration: ${error}`);
        }
    });

    // Edit configuration command
    const editCommand = vscode.commands.registerCommand('ddd.debugConfig.edit', async (item: DebugConfigurationItem) => {
        const config = item.config;
        const name = await vscode.window.showInputBox({
            value: config.name,
            placeHolder: 'Configuration name',
            prompt: 'Enter new configuration name'
        });

        if (name === undefined || name === config.name) return;

        try {
            if ('configurations' in config) {
                const newCompound: LaunchCompound = {
                    ...(config as LaunchCompound),
                    name
                };
                await provider.updateConfiguration(config.name, newCompound);
            } else {
                const newConfig: LaunchConfiguration = {
                    ...config,
                    name
                };
                await provider.updateConfiguration(config.name, newConfig);
            }
            vscode.window.showInformationMessage(`Configuration renamed to "${name}" successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to rename configuration: ${error}`);
        }
    });

    // Delete configuration command
    const deleteCommand = vscode.commands.registerCommand('ddd.debugConfig.delete', async (item: DebugConfigurationItem) => {
        const config = item.config;
        const result = await vscode.window.showWarningMessage(
            `Are you sure you want to delete configuration "${config.name}"?`,
            { modal: true },
            'Delete'
        );

        if (result === 'Delete') {
            try {
                await provider.deleteConfiguration(config.name);
                vscode.window.showInformationMessage(`Configuration "${config.name}" deleted successfully!`);
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
        // Cannot run/debug compound configurations
        if ('configurations' in item.config) {
            vscode.window.showWarningMessage('Cannot run compound configurations. Please run individual configurations.');
            return;
        }

        try {
            const success = await vscode.debug.startDebugging(undefined, item.config as LaunchConfiguration);
            if (success) {
                vscode.window.showInformationMessage(`Started running "${item.config.name}"`);
            } else {
                vscode.window.showErrorMessage(`Failed to start running "${item.config.name}"`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start running: ${error}`);
        }
    });

    // Debug configuration command
    const debugCommand = vscode.commands.registerCommand('ddd.debugConfig.debug', async (item: DebugConfigurationItem) => {
        // Cannot run/debug compound configurations
        if ('configurations' in item.config) {
            vscode.window.showWarningMessage('Cannot debug compound configurations. Please debug individual configurations.');
            return;
        }

        try {
            const success = await vscode.debug.startDebugging(undefined, item.config as LaunchConfiguration);
            if (success) {
                vscode.window.showInformationMessage(`Started debugging "${item.config.name}"`);
            } else {
                vscode.window.showErrorMessage(`Failed to start debugging "${item.config.name}"`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start debugging: ${error}`);
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

        // Get relative path from workspace root
        let relativePath = currentFile.replace(workspaceRoot, '');
        if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
            relativePath = relativePath.substring(1);
        }

        // Create configuration name based on relative path
        let configName = relativePath
            .replace(/\.(js|ts|py|java|cpp|c|go|rs|php|rb)$/, '') // Remove file extension
            .replace(/[\/\\]/g, ' ') // Replace path separators with spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();

        // If no name after processing, use file name without extension
        if (!configName) {
            const fileName = currentFile.split(/[\/\\]/).pop() || 'current-file';
            configName = fileName.replace(/\.[^.]*$/, '');
        }

        // Check for existing configurations and add suffix if needed
        const launchJson = await provider.readLaunchJson();
        let finalConfigName = configName;
        let counter = 1;

        while (launchJson.configurations.some(config => config.name === finalConfigName)) {
            finalConfigName = `${configName} - ${counter}`;
            counter++;
        }

        // Detect configuration type based on file extension
        const fileExtension = currentFile.split('.').pop()?.toLowerCase();
        let configType = 'node';

        switch (fileExtension) {
            case 'py':
                configType = 'python';
                break;
            case 'js':
            case 'mjs':
                configType = 'node';
                break;
            case 'ts':
                configType = 'node';
                break;
            case 'java':
                configType = 'java';
                break;
            case 'cpp':
            case 'c':
                configType = 'cppdbg';
                break;
            case 'go':
                configType = 'go';
                break;
            case 'rs':
                configType = 'rust';
                break;
            case 'php':
                configType = 'php';
                break;
            case 'rb':
                configType = 'ruby';
                break;
            default:
                configType = 'node';
        }

        const newConfig: LaunchConfiguration = {
            name: finalConfigName,
            type: configType,
            request: 'launch',
            program: relativePath
        };

        // Add type-specific properties
        if (configType === 'node') {
            newConfig.console = 'integratedTerminal';
            newConfig.stopOnEntry = false;
            if (fileExtension === 'ts') {
                newConfig.args = [relativePath];
                newConfig.runtimeArgs = ['-r', 'ts-node/register'];
            }
        } else if (configType === 'python') {
            newConfig.program = relativePath;
            newConfig.console = 'integratedTerminal';
            newConfig.justMyCode = true;
        } else if (configType === 'java') {
            newConfig.mainClass = relativePath.replace(/\.[^.]*$/, '').replace(/[\/\\]/g, '.');
            newConfig.projectName = 'Default Project';
        }

        try {
            await provider.addConfiguration(newConfig);
            vscode.window.showInformationMessage(`Quick configuration "${finalConfigName}" created for ${fileExtension?.toUpperCase() || 'current'} file!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create configuration: ${error}`);
        }
    });

    // Open settings command (using configuration editor)
    const openSettingsCommand = vscode.commands.registerCommand('ddd.debugConfig.openSettings', async (item: DebugConfigurationItem) => {
        ConfigurationEditor.openConfigurationEditor(item.config, provider);
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
        helloWorldCommand
    );
}