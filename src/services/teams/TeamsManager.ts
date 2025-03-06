import * as vscode from "vscode"
import { TeamsHub } from "./TeamsHub"
import { ClineProvider } from "../../core/webview/ClineProvider"

/**
 * TeamsManager is a singleton that manages the TeamsHub instance
 */
export class TeamsManager {
    private static instance: TeamsManager
    private static providers: Set<ClineProvider> = new Set()
    private teamsHub: TeamsHub | undefined
    private context: vscode.ExtensionContext
    private outputChannel: vscode.OutputChannel

    private constructor(context: vscode.ExtensionContext) {
        this.context = context
        this.outputChannel = vscode.window.createOutputChannel("Teams Integration")
    }

    /**
     * Get the TeamsManager instance
     * @param context The extension context
     * @param provider The ClineProvider instance
     * @returns A promise that resolves to the TeamsHub instance
     */
    public static async getInstance(
        context: vscode.ExtensionContext,
        provider: ClineProvider
    ): Promise<TeamsHub> {
        if (!TeamsManager.instance) {
            TeamsManager.instance = new TeamsManager(context)
        }

        // Register the provider
        TeamsManager.providers.add(provider)

        return TeamsManager.instance.getTeamsHub(provider)
    }

    /**
     * Unregister a provider
     * @param provider The ClineProvider instance to unregister
     */
    public static unregisterProvider(provider: ClineProvider): void {
        TeamsManager.providers.delete(provider)
    }

    /**
     * Get the TeamsHub instance
     * @param provider The ClineProvider instance
     * @returns A promise that resolves to the TeamsHub instance
     */
    private async getTeamsHub(provider: ClineProvider): Promise<TeamsHub> {
        if (!this.teamsHub) {
            this.teamsHub = new TeamsHub(this.context, provider, this.outputChannel)
            
            // Initialize the TeamsHub with the webhook URL from settings
            const state = await provider.getState()
            if (state.teamsEnabled && state.teamsWebhookUrl) {
                this.teamsHub.initialize(state.teamsWebhookUrl)
            }
        }

        return this.teamsHub
    }
}
