import { action, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import si from "systeminformation";

type SysInfoSettings = {
	stat?: string;
};

@action({ UUID: "com.tautvydas-fosron-tijunaitis.easy-sysinfo.widget" })
export class SysInfoWidget extends SingletonAction<SysInfoSettings> {
	private timers: { [context: string]: NodeJS.Timeout } = {};
	private settings: { [context: string]: SysInfoSettings } = {};

	override async onWillAppear(ev: WillAppearEvent<SysInfoSettings>): Promise<void> {
		const context = ev.action.id;
		console.log(`onWillAppear called for context: ${context}`);
		this.settings[context] = await ev.action.getSettings();
		console.log(`Loaded settings for ${context}:`, this.settings[context]);
		this.startPolling(context, ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<SysInfoSettings>): void {
		const context = ev.action.id;
		console.log(`onWillDisappear called for context: ${context}`);
		this.stopPolling(context);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<SysInfoSettings>): void {
		const context = ev.action.id;
		console.log(`onDidReceiveSettings called for context: ${context}`, ev.payload.settings);
		this.settings[context] = ev.payload.settings;
		this.startPolling(context, ev.action);
	}

	private startPolling(context: string, action: WillAppearEvent<SysInfoSettings>['action']) {
		this.stopPolling(context); // Stop any existing timer for this action
		this.updateStat(context, action);
		this.timers[context] = setInterval(() => this.updateStat(context, action), 2000);
	}

	private stopPolling(context: string) {
		if (this.timers[context]) {
			clearInterval(this.timers[context]);
			delete this.timers[context];
		}
	}

	private async updateStat(context: string, action: WillAppearEvent<SysInfoSettings>['action']) {
		const currentSettings = this.settings[context];
		console.log(`UpdateStat called for context ${context}, settings:`, currentSettings);
		
		if (!currentSettings?.stat) {
			console.log("No stat selected, showing 'Select Stat'");
			await action.setTitle("Select Stat");
			return;
		}

		let value = "N/A";
		let label = "";
		let unit = "";

		try {
			switch (currentSettings.stat) {
				case "cpu-usage":
					const currentLoad = await si.currentLoad();
					value = currentLoad.currentLoad.toFixed(1);
					label = "CPU";
					unit = "%";
					break;
				case "cpu-temp":
					const cpuTemp = await si.cpuTemperature();
					value = cpuTemp.main?.toString() || "N/A";
					label = "CPU TEMP";
					unit = "°C";
					break;
				case "mem-usage":
					const mem = await si.mem();
					const memUsedPercent = ((mem.total - mem.available) / mem.total * 100);
					value = memUsedPercent.toFixed(1);
					label = "MEM";
					unit = "%";
					break;
				case "net-upload":
					const netStatsUp = await si.networkStats();
					const tx_sec = netStatsUp[0]?.tx_sec / (1024 * 1024) || 0;
					value = tx_sec.toFixed(2);
					label = "UP";
					unit = "MB/s";
					break;
				case "net-download":
					const netStatsDown = await si.networkStats();
					const rx_sec = netStatsDown[0]?.rx_sec / (1024 * 1024) || 0;
					value = rx_sec.toFixed(2);
					label = "DOWN";
					unit = "MB/s";
					break;
				case "battery":
					const battery = await si.battery();
					value = battery.percent?.toString() || "N/A";
					label = "BATT";
					unit = "%";
					break;
				case "disk-space":
					const fsSize = await si.fsSize();
					if (fsSize && fsSize.length > 0) {
						// Find the disk with the largest total space
						const largestDisk = fsSize.reduce((largest, current) => 
							current.size > largest.size ? current : largest
						);
						const usedPercent = (largestDisk.used / largestDisk.size * 100);
						value = usedPercent.toFixed(1);
						label = "DISK";
						unit = "%";
					}
					break;
			}
		} catch (error) {
			console.error(error);
			value = "ERROR";
			label = "";
			unit = "";
		}

		// Create SVG image with the value
		const svgImage = this.createSVGImage(value, unit);
		await action.setImage(svgImage);
		await action.setTitle(label); // Use Stream Deck's native title
	}

	private createSVGImage(value: string, unit: string): string {
		// Check if this is a network stat (MB/s) which needs special handling
		const isNetworkStat = unit === "MB/s";
		
		// Determine font size based on value length - much bigger numbers now
		let fontSize = 48;
		if (value.length > 3) fontSize = 40;
		if (value.length > 4) fontSize = 36;
		if (value.length > 5) fontSize = 32;

		let svg;
		
		if (isNetworkStat) {
			// For network stats: put unit on top, value below
			svg = `
				<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
					<!-- Transparent background to match Stream Deck style -->
					
					<!-- Unit at top -->
					<text x="72" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">${unit}</text>
					
					<!-- Main value (large text in center) -->
					<text x="72" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#FFFFFF">${value}</text>
				</svg>
			`;
		} else {
			// For other stats: combine value and unit
			const displayText = `${value}${unit}`;
			svg = `
				<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
					<!-- Transparent background to match Stream Deck style -->
					
					<!-- Main value with unit (large text in center) -->
					<text x="72" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#FFFFFF">${displayText}</text>
				</svg>
			`;
		}

		// Convert SVG to base64 data URL
		const base64 = Buffer.from(svg).toString('base64');
		return `data:image/svg+xml;base64,${base64}`;
	}
}