import * as vscode from "vscode"
import axios from "axios"
import { ClineProvider } from "../../core/webview/ClineProvider"
import { ClineMessage, ClineSay } from "../../shared/ExtensionMessage"

/**
 * TeamsHub is responsible for sending messages to Microsoft Teams
 */
export class TeamsHub {
	private context: vscode.ExtensionContext
	private provider: ClineProvider
	private outputChannel: vscode.OutputChannel
	private webhookUrl: string | undefined
	private teamsEnabled: boolean = false

	constructor(context: vscode.ExtensionContext, provider: ClineProvider, outputChannel: vscode.OutputChannel) {
		this.context = context
		this.provider = provider
		this.outputChannel = outputChannel
	}

	/**
	 * Initialize the Teams hub with the webhook URL
	 * @param webhookUrl The Teams webhook URL
	 */
	public initialize(webhookUrl: string): void {
		this.webhookUrl = webhookUrl
		this.teamsEnabled = true
		this.log(`Teams hub initialized with webhook URL: ${webhookUrl}`)
	}

	/**
	 * Send a message to Microsoft Teams
	 * @param message The message to send
	 * @returns A promise that resolves when the message is sent
	 */
	public async sendMessage(message: string): Promise<void> {
		this.teamsEnabled = true
		this.webhookUrl = "http://192.168.1.46:3978/api/notification"

		this.log("Sending message to teams")

		if (!this.webhookUrl || !this.teamsEnabled) {
			this.log("Cannot send message to Teams: webhook URL not configured or Teams integration disabled")
			throw new Error("Teams webhook URL not configured or Teams integration disabled")
		}

		try {
			// Teams webhook API expects a JSON payload with a text property
			await axios.post(this.webhookUrl, {
				message: message,
			})

			this.log(`Message sent to Teams: ${message}`)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.log(`Error sending message to Teams: ${errorMessage}`)
			throw error
		}
	}

	/**
	 * Receive a message from Microsoft Teams and forward it to Cline
	 * @param message The message received from Teams
	 * @returns A promise that resolves when the message is processed
	 */
	public async receiveMessage(message: string): Promise<void> {
		this.log(`Received message from Teams: ${message}`)

		if (!this.webhookUrl || !this.teamsEnabled) {
			this.log("Cannot process message from Teams: Teams integration disabled")
			return
		}

		try {
			// Forward the message to Cline
			await this.provider.handleTeamsMessage(message)
			this.log(`Message from Teams processed: ${message}`)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.log(`Error processing message from Teams: ${errorMessage}`)
			throw error
		}
	}

	/**
	 * Send a Cline message to Microsoft Teams
	 * @param message The Cline message to send
	 * @returns A promise that resolves when the message is sent
	 */
	public async sendClineMessage(message: ClineMessage): Promise<void> {
		if (!this.webhookUrl || !this.teamsEnabled) {
			return // Silently return if Teams integration is disabled
		}

		// Only send certain message types to Teams
		if (message.type !== "say") {
			return
		}

		// Filter which message types to send to Teams
		const messagesToSend: ClineSay[] = ["text", "completion_result", "error", "command_output"]

		if (!messagesToSend.includes(message.say as ClineSay)) {
			return
		}

		try {
			// Format the message for Teams
			let teamsMessage = ""

			// Add timestamp
			const date = new Date(message.ts)
			teamsMessage += `**[${date.toLocaleTimeString()}]** `

			// Add message type
			teamsMessage += `**${message.say}**: `

			// Add message content
			if (message.text) {
				teamsMessage += message.text
			}

			// Send the message to Teams
			await this.sendMessage(teamsMessage)
		} catch (error) {
			// Log the error but don't throw - we don't want to interrupt the normal flow
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.log(`Error sending Cline message to Teams: ${errorMessage}`)
		}
	}

	/**
	 * Dispose of the Teams hub
	 */
	public dispose(): void {
		this.log("Teams hub disposed")
	}

	/**
	 * Log a message to the output channel
	 * @param message The message to log
	 */
	private log(message: string): void {
		this.outputChannel.appendLine(`[TeamsHub] ${message}`)
	}
}
