class Points {

	constructor() {

		this.points = new Map() // userid -> points
		this.guildpoints = new Map() // guildid -> (userid -> points)

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
