import { db } from "./sql.js";
import Logger, { COLOR } from "./logger.js";

const logger = new Logger("Points", COLOR.LIGHT_GREEN)
class Points {

	constructor() {

		this.points = new Map() // userid -> points
		this.guildpoints = new Map() // guildid -> (userid -> points)
		db.query("SELECT * FROM users").then(rows => {
			for(const row of rows[0]) {
				if(!this.points.has(row.id)) this.points.set(row.id + "", row.points);
				else this.points.set(row.id, this.points.get(row.id + "") + row.points)
				const guild = this.guildpoints.get(row.guild) || new Map()
				guild.set(row.id, row.points)
				this.guildpoints.set(row.guild, guild)
			}
		});

	}

	addPoints(uid, gid, points) {
		let globalpoints = this.points.get(uid) || 0
		globalpoints += points
		this.points.set(uid, globalpoints)

		let guild = this.guildpoints.get(gid) || new Map()
		let guildpoints = guild.get(uid) || 0
		guildpoints += points
		guild.set(uid, guildpoints)
		this.guildpoints.set(gid, guild)

		db.query("INSERT INTO users (id, guild, points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE points = points + ?", [uid, gid, globalpoints, points]).catch(err => logger.error(err))
	}

	getPoints(uid, gid) {
		let globalpoints = this.points.get(uid) || 0
		let guild = this.guildpoints.get(gid) || new Map()
		let guildpoints = guild.get(uid) || 0

		return { global: globalpoints, guildpoints }
	}

	getTopList(gid) {
		let list = this.points
		if(gid) list = this.guildpoints.get(gid) || new Map()
		list = Array.from(list)

		return list.sort((a, b) => b[1] - a[1])
	}

}

const points = new Points()

export default points
