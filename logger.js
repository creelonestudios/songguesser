export const COLOR = {
	BLACK:     30, DARK_RED:  31, DARK_GREEN:  32, DARK_YELLOW:  33, DARK_BLUE:  34, DARK_PURPLE:  35, DARK_AQUA:  36, LIGHT_GRAY: 37,
	DARK_GRAY: 90, LIGHT_RED: 91, LIGHT_GREEN: 92, LIGHT_YELLOW: 93, LIGHT_BLUE: 94, LIGHT_PURPLE: 95, LIGHT_AQUA: 96, WHITE:      97
}

const esc = "\u001b"

export default class Logger {

	constructor(feature, color) {
		this.feature = feature
		this.color   = color || 0
		if(COLOR.hasOwnProperty(color)) this.color = COLOR[color]
	}

	log(...args) {
		console.log(`${esc}[m[${esc}[${this.color}m${this.feature}${esc}[m]`, ...args, `${esc}[m`)
	}

	error(...args) {
		console.error(`${esc}[m[${esc}[${this.color}m${this.feature}${esc}[m]${esc}[91m`, ...args, `${esc}[m`)
	}

	debug(...args) {
		if(process.argv.includes("debug")) console.debug(`${esc}[m[${esc}[${this.color}m${this.feature}${esc}[m]${esc}[36m`, ...args, `${esc}[m`)
	}

	trace(...args) {
		console.trace(`${esc}[m[${esc}[${this.color}m${this.feature}${esc}[m]`, ...args, `${esc}[m`)
	}

}
