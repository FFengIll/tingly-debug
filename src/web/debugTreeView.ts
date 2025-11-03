import * as vscode from 'vscode';
import { LaunchConfiguration, LaunchCompound, LaunchJson, ClickBehavior } from './types';

export class DebugConfigurationItem extends vscode.TreeItem {
    constructor(
        public readonly config: LaunchConfiguration | LaunchCompound,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        private clickBehavior?: ClickBehavior
    ) {
        super(config.name, collapsibleState);
        this.tooltip = config.name;
        this.description = this.getDescription(config);
        this.contextValue = 'configuration';
        this.iconPath = new vscode.ThemeIcon('gear');

        // Set command based on click behavior configuration
        if (clickBehavior === 'openSettings') {
            this.command = {
                command: 'ddd.debugConfig.openSettings',
                title: 'Open Configuration Settings',
                arguments: [this]
            };
        }
    }

    private getDescription(config: LaunchConfiguration | LaunchCompound): string {
        if ('configurations' in config) {
            return `Compound (${config.configurations.length} configurations)`;
        }
        return `${config.type} - ${config.request}`;
    }
}

export class DebugConfigurationProvider implements vscode.TreeDataProvider<DebugConfigurationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DebugConfigurationItem | undefined | null | void> = new vscode.EventEmitter<DebugConfigurationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DebugConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private workspaceRoot: string;
    private launchJsonPath: string;

    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.workspaceRoot = workspaceFolders[0].uri.fsPath;
        } else {
            this.workspaceRoot = '';
        }
        this.launchJsonPath = `${this.workspaceRoot}/.vscode/launch.json`;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DebugConfigurationItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DebugConfigurationItem): Thenable<DebugConfigurationItem[]> {
        if (!element) {
            // Root level - return all configurations and compounds
            return this.getConfigurations();
        }
        return Promise.resolve([]);
    }

    public async getConfigurations(): Promise<DebugConfigurationItem[]> {
        try {
            const launchJson = await this.readLaunchJson();
            const config = vscode.workspace.getConfiguration('ddd');
            const clickBehavior = config.get<ClickBehavior>('clickBehavior', 'openSettings');

            const items: DebugConfigurationItem[] = [];

            // Add configurations
            for (const config of launchJson.configurations) {
                items.push(new DebugConfigurationItem(config, vscode.TreeItemCollapsibleState.None, clickBehavior));
            }

            // Add compounds if they exist
            if (launchJson.compounds) {
                for (const compound of launchJson.compounds) {
                    items.push(new DebugConfigurationItem(compound, vscode.TreeItemCollapsibleState.None, clickBehavior));
                }
            }

            return items;
        } catch (error) {
            console.error('Error reading launch.json:', error);
            return [];
        }
    }

    public async readLaunchJson(): Promise<LaunchJson> {
        try {
            const launchUri = vscode.Uri.file(this.launchJsonPath);
            const document = await vscode.workspace.openTextDocument(launchUri);
            const content = document.getText();
            return JSON.parse(content);
        } catch (error) {
            // Return default structure if file doesn't exist or is invalid
            return {
                version: "0.2.0",
                configurations: []
            };
        }
    }

    async writeLaunchJson(launchJson: LaunchJson): Promise<void> {
        try {
            const content = JSON.stringify(launchJson, null, 2);
            const launchUri = vscode.Uri.file(this.launchJsonPath);

            // Create .vscode directory if it doesn't exist
            const vscodeDir = this.launchJsonPath.substring(0, this.launchJsonPath.lastIndexOf('/'));
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(vscodeDir));
            } catch {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodeDir));
            }

            await vscode.workspace.fs.writeFile(launchUri, new TextEncoder().encode(content));
        } catch (error) {
            throw new Error(`Failed to write launch.json: ${error}`);
        }
    }

    async addConfiguration(config: LaunchConfiguration): Promise<void> {
        const launchJson = await this.readLaunchJson();
        launchJson.configurations.push(config);
        await this.writeLaunchJson(launchJson);
        this.refresh();
    }

    async updateConfiguration(oldName: string, newConfig: LaunchConfiguration | LaunchCompound): Promise<void> {
        const launchJson = await this.readLaunchJson();

        // Find and update configuration
        const configIndex = launchJson.configurations.findIndex(config => config.name === oldName);
        if (configIndex !== -1) {
            launchJson.configurations[configIndex] = newConfig as LaunchConfiguration;
        } else {
            // Check if it's a compound
            const compoundIndex = launchJson.compounds?.findIndex(compound => compound.name === oldName);
            if (compoundIndex !== undefined && compoundIndex !== -1) {
                launchJson.compounds![compoundIndex] = newConfig as LaunchCompound;
            } else {
                throw new Error(`Configuration "${oldName}" not found`);
            }
        }

        await this.writeLaunchJson(launchJson);
        this.refresh();
    }

    async deleteConfiguration(name: string): Promise<void> {
        const launchJson = await this.readLaunchJson();

        // Remove from configurations
        const configIndex = launchJson.configurations.findIndex(config => config.name === name);
        if (configIndex !== -1) {
            launchJson.configurations.splice(configIndex, 1);
        } else {
            // Check if it's a compound
            const compoundIndex = launchJson.compounds?.findIndex(compound => compound.name === name);
            if (compoundIndex !== undefined && compoundIndex !== -1) {
                launchJson.compounds!.splice(compoundIndex, 1);
            } else {
                throw new Error(`Configuration "${name}" not found`);
            }
        }

        await this.writeLaunchJson(launchJson);
        this.refresh();
    }

    async duplicateConfiguration(config: LaunchConfiguration | LaunchCompound): Promise<void> {
        const launchJson = await this.readLaunchJson();

        if ('configurations' in config) {
            // Duplicate compound
            const newCompound: LaunchCompound = {
                name: `${config.name} Copy`,
                configurations: [...(config as LaunchCompound).configurations]
            };
            launchJson.compounds = launchJson.compounds || [];
            launchJson.compounds.push(newCompound);
        } else {
            // Duplicate configuration
            const newConfig: LaunchConfiguration = {
                ...config,
                name: `${config.name} Copy`
            };
            launchJson.configurations.push(newConfig);
        }

        await this.writeLaunchJson(launchJson);
        this.refresh();
    }
}